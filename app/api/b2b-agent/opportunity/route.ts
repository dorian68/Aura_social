import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { createOpportunityForBusiness, discoverBusinesses } from "@/lib/b2b-agent/orchestrator";
import { getB2BAgentState, setB2BAgentState } from "@/lib/b2b-agent/store";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as {
      businessId?: string;
      proposedBudget?: number;
      location?: string;
    };
    const state = getB2BAgentState();
    const businesses = state.businesses.length
      ? state.businesses
      : discoverBusinesses({ location: body.location || "Fort-de-France" });
    const business = body.businessId
      ? businesses.find((item) => item.id === body.businessId)
      : businesses[0];

    if (!business) {
      return fail("B2B_BUSINESS_NOT_FOUND", "No business was available for opportunity generation.", 404);
    }

    const opportunity = createOpportunityForBusiness(
      business,
      body.proposedBudget || 200,
      body.location || business.city,
    );
    setB2BAgentState({
      ...state,
      businesses: mergeById(state.businesses, businesses),
      opportunities: mergeById(state.opportunities, [opportunity]),
    });

    return ok({ opportunity });
  } catch (error) {
    return handleApiError(error, "B2B_OPPORTUNITY_FAILED");
  }
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
