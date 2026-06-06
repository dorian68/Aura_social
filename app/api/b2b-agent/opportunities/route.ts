import { ok } from "@/lib/apiResponse";
import { getB2BAgentState } from "@/lib/b2b-agent/store";

export async function GET() {
  const state = getB2BAgentState();
  return ok({
    businesses: state.businesses,
    scores: state.fitScores,
    opportunities: state.opportunities,
    outreachDrafts: state.outreachDrafts,
    campaigns: state.campaigns,
    platformRevenue: state.platformRevenue,
  });
}
