import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { generateDmDraft } from "@/lib/agent/agentOrchestrator";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as { programId?: string };
    const state = getLoyaltyState();
    const programId = body.programId || getDemoProgramId();

    return ok(
      {
        drafts: generateDmDraft(state, programId),
      },
      {
        execution: "DM sending is not autonomous. Approve and execute is a mocked safe action.",
      },
    );
  } catch (error) {
    return handleApiError(error, "AGENT_DM_DRAFT_FAILED");
  }
}
