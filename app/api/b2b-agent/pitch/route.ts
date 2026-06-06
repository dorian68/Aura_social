import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { buildB2BContext, createOpportunityForBusiness, discoverBusinesses } from "@/lib/b2b-agent/orchestrator";
import { generateB2BPitch } from "@/lib/b2b-agent/pitchGenerator";
import { getB2BAgentState, setB2BAgentState } from "@/lib/b2b-agent/store";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as {
      businessId?: string;
      opportunityId?: string;
      location?: string;
    };
    const state = getB2BAgentState();
    const businesses = state.businesses.length
      ? state.businesses
      : discoverBusinesses({ location: body.location || "Fort-de-France" });
    const opportunity = body.opportunityId
      ? state.opportunities.find((item) => item.id === body.opportunityId)
      : state.opportunities[0];
    const business = body.businessId
      ? businesses.find((item) => item.id === body.businessId)
      : businesses.find((item) => item.id === opportunity?.businessId) || businesses[0];

    if (!business) {
      return fail("B2B_BUSINESS_NOT_FOUND", "No business was available for pitch generation.", 404);
    }

    const finalOpportunity = opportunity || createOpportunityForBusiness(business, 200, body.location || business.city);
    const pitch = generateB2BPitch({
      business,
      opportunity: finalOpportunity,
      context: buildB2BContext(),
    });

    setB2BAgentState({
      ...state,
      businesses: mergeById(state.businesses, businesses),
      opportunities: mergeById(state.opportunities, [finalOpportunity]),
      outreachDrafts: mergeById(state.outreachDrafts, [pitch]),
    });

    return ok(
      { pitch },
      { approvalRequired: true, externalMessagesSent: 0 },
    );
  } catch (error) {
    return handleApiError(error, "B2B_PITCH_FAILED");
  }
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
