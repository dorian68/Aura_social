import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { generateCampaignDraft } from "@/lib/agent/agentOrchestrator";
import { getDemoProgramId, getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as { programId?: string };
    const state = getLoyaltyState();
    const programId = body.programId || getDemoProgramId();
    const result = generateCampaignDraft(state, programId);
    setLoyaltyState({
      ...state,
      campaigns: [...state.campaigns, result.campaign],
    });

    return ok(result, {
      execution: "Draft only. Campaign execution requires creator approval.",
    });
  } catch (error) {
    return handleApiError(error, "AGENT_CAMPAIGN_DRAFT_FAILED");
  }
}
