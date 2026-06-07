import crypto from "node:crypto";
import type { UIBlock as OperatorUIBlock, UIBlockType } from "@/lib/operator/types";
import type { AgentUIBlock, AgentUIBlockKind } from "./types";
import { sanitizeForAgent } from "./sanitize";

/**
 * Maps the operator's UIBlock vocabulary onto the AG-UI renderer allowlist
 * (AG_UI_IMPLEMENTATION_GUIDE §20, §29.10). The frontend AgentUIBlockRenderer
 * only draws these kinds; anything else is skipped instead of executing code.
 */
const KIND_MAP: Record<UIBlockType, AgentUIBlockKind> = {
  kpi: "metric_grid",
  action_plan: "action_plan",
  tool_result: "tool_result",
  reward_card: "summary_card",
  fan_pass: "summary_card",
  b2b_opportunity: "b2b_opportunity",
  pitch_preview: "summary_card",
  token_economy: "token_economy",
  health_status: "health_status",
  confirmation: "confirmation_card",
  audit_event: "audit_event",
};

export function toAgentUIBlock(block: OperatorUIBlock): AgentUIBlock {
  return {
    kind: KIND_MAP[block.type] ?? "summary_card",
    id: `block_${crypto.randomUUID()}`,
    title: block.title,
    data: sanitizeForAgent(block.data),
  };
}

/** Build a confirmation UIBlock for a human-in-the-loop approval request. */
export function buildConfirmationBlock(payload: {
  tool: string;
  args: Record<string, unknown>;
  warning: string;
  confirmationToken?: string;
}): AgentUIBlock {
  return {
    kind: "confirmation_card",
    id: `approval_${crypto.randomUUID()}`,
    title: "Confirmation required",
    data: {
      approvalId: payload.confirmationToken || crypto.randomUUID(),
      tool: payload.tool,
      arguments: sanitizeForAgent(payload.args),
      warning: payload.warning,
      confirmationToken: payload.confirmationToken,
      riskLevel: "medium",
      actions: [
        { id: "approve", label: "Approve & run", variant: "primary" },
        { id: "reject", label: "Cancel", variant: "secondary" },
      ],
    },
  };
}

/** Build a suggestion-chips block from the operator's nextActions. */
export function buildSuggestionsBlock(nextActions: string[]): AgentUIBlock | null {
  const chips = nextActions.filter(Boolean).slice(0, 6);
  if (!chips.length) return null;
  return {
    kind: "suggestion_chips",
    id: `suggestions_${crypto.randomUUID()}`,
    data: { chips },
  };
}
