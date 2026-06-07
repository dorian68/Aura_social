/**
 * AG-UI (Agent–User Interaction Protocol) types for Aura.
 *
 * These mirror the canonical AG-UI event families (lifecycle, text, tool, state,
 * activity, custom) described in AG_UI_IMPLEMENTATION_GUIDE.md §5 and §15, scoped
 * to what the Aura operator runtime actually emits. No external AG-UI SDK is
 * installed, so we keep a small, self-contained type surface.
 */

export type AGUIRole = "developer" | "system" | "assistant" | "user" | "tool" | "activity" | "reasoning";

export interface AGUIMessage {
  id: string;
  role: AGUIRole;
  content?: string;
  name?: string;
}

export interface AGUITool {
  name: string;
  description: string;
  parameters?: unknown;
}

export interface AGUIContext {
  description: string;
  value: string;
}

/** Input payload accepted by POST /api/ag-ui/run (AG_UI_IMPLEMENTATION_GUIDE §6). */
export interface RunAgentInput {
  threadId?: string;
  runId?: string;
  parentRunId?: string | null;
  state?: unknown;
  messages: AGUIMessage[];
  tools?: AGUITool[];
  context?: AGUIContext[];
  forwardedProps?: Record<string, unknown>;
}

export type AGUIEvent =
  | { type: "RunStarted"; threadId: string; runId: string; timestamp: string }
  | { type: "RunFinished"; threadId: string; runId: string; outcome: { type: "success" }; timestamp: string }
  | { type: "RunError"; message: string; code?: string; timestamp: string }
  | { type: "StepStarted"; stepName: string; timestamp: string }
  | { type: "StepFinished"; stepName: string; timestamp: string }
  | { type: "StateSnapshot"; snapshot: unknown; timestamp: string }
  | { type: "TextMessageStart"; messageId: string; role: AGUIRole; timestamp: string }
  | { type: "TextMessageContent"; messageId: string; delta: string; timestamp: string }
  | { type: "TextMessageEnd"; messageId: string; timestamp: string }
  | { type: "ToolCallStart"; toolCallId: string; toolCallName: string; parentMessageId?: string; timestamp: string }
  | { type: "ToolCallArgs"; toolCallId: string; delta: string; timestamp: string }
  | { type: "ToolCallEnd"; toolCallId: string; timestamp: string }
  | { type: "ToolCallResult"; messageId: string; toolCallId: string; content: string; role: "tool"; timestamp: string }
  | { type: "ActivitySnapshot"; messageId: string; activityType: string; content: unknown; replace?: boolean; timestamp: string }
  | { type: "Custom"; name: string; value: unknown; timestamp: string };

/**
 * Namespaced custom event names the Aura frontend understands. Anything else is
 * ignored by the renderer (allowlist enforced client-side too).
 */
export const AG_UI_CUSTOM = {
  RENDER_BLOCK: "app.render_component",
  APPROVAL_REQUIRED: "app.approval.required",
  SUGGESTIONS: "app.suggestions",
  NAVIGATE: "app.navigate",
  TOAST: "app.toast",
} as const;

/** Allowlisted UIBlock kinds the renderer can draw. Unknown kinds are skipped. */
export type AgentUIBlockKind =
  | "summary_card"
  | "metric_grid"
  | "action_plan"
  | "health_status"
  | "b2b_opportunity"
  | "token_economy"
  | "confirmation_card"
  | "suggestion_chips"
  | "audit_event"
  | "tool_result"
  | "error_card";

export interface AgentUIBlock {
  kind: AgentUIBlockKind;
  id: string;
  title?: string;
  data: Record<string, unknown>;
}
