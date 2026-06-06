import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { createReward } from "@/lib/loyalty/rewardEngine";
import { getDefaultWorkspaceId, recordAuditEvent } from "@/lib/workspace/store";
import { validateIdentifier, GuardrailError } from "@/lib/agentGuardrails";
import type { AgentRecommendationStatus } from "@/lib/loyalty/types";

export const runtime = "nodejs";

const validActions: Record<string, AgentRecommendationStatus> = {
  approve: "approved",
  reject: "rejected",
  execute_mock: "executed",
  execute: "executed",
};

// A recommendation cannot leave these states — guards against replay /
// double-execution (critical once execute_mock is wired to a real side effect).
const TERMINAL_STATUSES: AgentRecommendationStatus[] = ["executed", "rejected"];

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as {
      recommendationId?: string;
      action?: keyof typeof validActions;
    };
    if (!body.action || !validActions[body.action]) {
      return fail(
        "AGENT_ACTION_INVALID",
        "action is required. Valid actions: approve, reject, execute_mock.",
        400,
      );
    }

    let recommendationId: string;
    try {
      recommendationId = validateIdentifier(body.recommendationId, "recommendationId");
    } catch (e) {
      const err = e as GuardrailError;
      return fail(err.code || "AGENT_ACTION_INVALID", err.message, 400);
    }

    const state = getLoyaltyState();
    // Look up only — never generate-on-miss (that turned this endpoint into an
    // unauthenticated orchestrator-run + disk-write amplification vector).
    const recommendation = state.recommendations.find((item) => item.id === recommendationId);
    if (!recommendation) {
      return fail("AGENT_RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", 404);
    }

    // State-machine + idempotency guard: terminal recommendations are immutable.
    if (TERMINAL_STATUSES.includes(recommendation.status)) {
      return fail(
        "AGENT_RECOMMENDATION_TERMINAL",
        `Recommendation is already "${recommendation.status}" and cannot be changed.`,
        409,
      );
    }

    const nextStatus = validActions[body.action];
    let nextState = {
      ...state,
      recommendations: state.recommendations.map((item) =>
        item.id === recommendationId ? { ...recommendation, status: nextStatus } : item,
      ),
    };

    let createdObject: { kind: string; id: string; name: string } | null = null;
    let executionNote =
      body.action === "approve" ? "Recommendation approved." : body.action === "reject" ? "Recommendation rejected." : "Recommendation executed.";

    // REAL execution: create the matching object where one is defined for the type;
    // otherwise acknowledge honestly (no fake object, no "executed" with no effect).
    if (nextStatus === "executed") {
      if (recommendation.type === "reward") {
        const name = (recommendation.title || "Agent-suggested reward").replace(/[^\w\s\-·€%]/g, "").trim().slice(0, 80) || "Agent-suggested reward";
        const result = createReward(nextState, {
          programId: recommendation.programId,
          name,
          description: recommendation.suggestedAction,
          costInPoints: 500,
          rewardType: "exclusive_content",
          stock: null,
        });
        nextState = result.state; // recommendation status already applied above
        createdObject = { kind: "reward", id: result.reward.id, name: result.reward.name };
        executionNote = `Created reward "${result.reward.name}" (${result.reward.costInPoints} pts) from this recommendation.`;
        recordAuditEvent({
          workspaceId: getDefaultWorkspaceId(),
          actorType: "agent",
          action: "agent.recommendation_executed",
          targetType: "reward",
          targetId: result.reward.id,
          severity: "info",
          message: `Executed recommendation "${recommendation.title}" → created reward.`,
          metadata: { recommendationId, rewardId: result.reward.id, type: recommendation.type },
        });
      } else {
        executionNote = `Recommendation acknowledged. Type "${recommendation.type}" has no auto-created object — act on it from the matching tool.`;
        recordAuditEvent({
          workspaceId: getDefaultWorkspaceId(),
          actorType: "agent",
          action: "agent.recommendation_acknowledged",
          targetType: "recommendation",
          targetId: recommendationId,
          severity: "info",
          message: `Acknowledged recommendation "${recommendation.title}" (${recommendation.type}).`,
          metadata: { recommendationId, type: recommendation.type },
        });
      }
    }

    setLoyaltyState(nextState);
    const updated = nextState.recommendations.find((item) => item.id === recommendationId);

    return ok(
      { recommendation: updated, createdObject, execution: executionNote },
      { objectCreated: Boolean(createdObject), externalActionsPerformed: 0 },
    );
  } catch (error) {
    return handleApiError(error, "AGENT_ACTION_FAILED");
  }
}
