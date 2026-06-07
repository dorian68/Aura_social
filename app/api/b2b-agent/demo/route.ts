import { ok } from "@/lib/apiResponse";
import { buildB2BContext, discoverBusinesses, scoreDiscoveredBusinesses } from "@/lib/b2b-agent/orchestrator";
import { getB2BAgentState } from "@/lib/b2b-agent/store";

export async function GET() {
  const context = buildB2BContext();
  const businesses = discoverBusinesses({
    location: "Fort-de-France",
    categories: ["restaurant", "bar", "concept_store", "gym", "beauty"],
  });
  const scores = scoreDiscoveredBusinesses(businesses, "Fort-de-France");
  const state = getB2BAgentState();

  return ok({
    context,
    businesses,
    scores,
    runs: state.runs,
    opportunities: state.opportunities,
    platformRevenue: state.platformRevenue,
    platformRevenueSource: "campaign_commissions",
    mockMode: true,
  });
}
