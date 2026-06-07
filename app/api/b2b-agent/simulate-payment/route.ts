import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { discoverBusinesses } from "@/lib/b2b-agent/orchestrator";
import { simulateSmePayment } from "@/lib/b2b-agent/paymentSimulator";
import {
  calculateB2BPlatformRevenue,
  getB2BAgentState,
  hasB2BRevenueCampaignForOpportunity,
  setB2BAgentState,
} from "@/lib/b2b-agent/store";
import { GuardrailError, validateAmount, validateIdentifier } from "@/lib/agentGuardrails";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as {
      opportunityId?: string;
      campaignBudget?: number;
    };

    let campaignBudget: number;
    let opportunityId: string | undefined;
    try {
      campaignBudget = validateAmount(body.campaignBudget, "campaignBudget", { fallback: 200, min: 1, max: 1_000_000 });
      opportunityId = body.opportunityId == null ? undefined : validateIdentifier(body.opportunityId, "opportunityId");
    } catch (e) {
      const err = e as GuardrailError;
      return fail(err.code || "B2B_PAYMENT_INVALID", err.message, 400);
    }

    const state = getB2BAgentState();
    // If an explicit id is given but missing, 404 — do not silently fall back to [0].
    const opportunity = opportunityId
      ? state.opportunities.find((item) => item.id === opportunityId)
      : state.opportunities[0];

    if (!opportunity) {
      return fail("B2B_OPPORTUNITY_NOT_FOUND", "Run the B2B agent before simulating payment.", 404);
    }

    // Idempotency: a paid opportunity must not create duplicate campaign
    // commissions now, or duplicate Stripe charges once a real adapter lands.
    if (opportunity.status === "simulated_paid") {
      return fail("B2B_PAYMENT_ALREADY_SIMULATED", "Payment was already simulated for this opportunity.", 409);
    }
    if (hasB2BRevenueCampaignForOpportunity(state.campaigns, opportunity.id)) {
      return fail("B2B_PAYMENT_ALREADY_SIMULATED", "A monetized campaign already exists for this opportunity.", 409);
    }

    const business =
      state.businesses.find((item) => item.id === opportunity.businessId) ||
      discoverBusinesses({ location: "Fort-de-France" }).find((item) => item.id === opportunity.businessId);

    if (!business) {
      return fail("B2B_BUSINESS_NOT_FOUND", "The business linked to this opportunity was not found.", 404);
    }

    const result = simulateSmePayment(opportunity, business, campaignBudget);
    const updatedOpportunity = {
      ...opportunity,
      status: "simulated_paid" as const,
    };

    const campaigns = mergeById(state.campaigns, [result.campaign]);
    setB2BAgentState({
      ...state,
      opportunities: state.opportunities.map((item) =>
        item.id === opportunity.id ? updatedOpportunity : item,
      ),
      campaigns,
      platformRevenue: calculateB2BPlatformRevenue(campaigns),
    });

    return ok(result, {
      mockMode: true,
      stripeChargeCreated: false,
    });
  } catch (error) {
    return handleApiError(error, "B2B_PAYMENT_SIMULATION_FAILED");
  }
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
