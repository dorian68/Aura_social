import type { NextRequest } from "next/server";
import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { runAgentOrchestrator } from "@/lib/agent/agentOrchestrator";
import { getDemoProgramId, getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";

export async function GET(request: NextRequest) {
  const state = getLoyaltyState();
  const programId = request.nextUrl.searchParams.get("programId") || getDemoProgramId();
  return ok({
    recommendations: state.recommendations.filter((item) => item.programId === programId),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as { programId?: string };
    const state = getLoyaltyState();
    const programId = body.programId || getDemoProgramId();
    const result = runAgentOrchestrator(state, programId);
    setLoyaltyState({
      ...state,
      recommendations: [
        ...state.recommendations.filter((item) => item.programId !== programId),
        ...result.recommendations,
      ],
    });

    return ok(result, {
      execution: "Recommendations only. Approve and execute is mocked until integrations are configured.",
    });
  } catch (error) {
    return handleApiError(error, "AGENT_RECOMMENDATIONS_FAILED");
  }
}
