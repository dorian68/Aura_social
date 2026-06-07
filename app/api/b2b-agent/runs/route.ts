import { ok } from "@/lib/apiResponse";
import { getB2BAgentState } from "@/lib/b2b-agent/store";

export async function GET() {
  const state = getB2BAgentState();
  return ok({
    runs: state.runs,
    platformRevenue: state.platformRevenue,
    platformRevenueSource: "campaign_commissions",
  });
}
