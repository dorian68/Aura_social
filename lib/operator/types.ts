export type ToolRiskLevel = "safe" | "confirmation_required" | "dangerous";
export type ToolCategory =
  | "workspace"
  | "loyalty"
  | "fan_pass"
  | "token_economy"
  | "recommendations"
  | "b2b_agent"
  | "contracts"
  | "navigation";

export type UIBlockType =
  | "kpi"
  | "action_plan"
  | "tool_result"
  | "reward_card"
  | "fan_pass"
  | "b2b_opportunity"
  | "pitch_preview"
  | "token_economy"
  | "health_status"
  | "confirmation"
  | "audit_event";

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolInputProperty>;
  required?: string[];
}

export interface ToolInputProperty {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  enum?: string[];
  default?: unknown;
  items?: { type: string };
}

export interface ToolOutputSchema {
  description: string;
  uiBlock?: UIBlockType;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  category: ToolCategory;
  riskLevel: ToolRiskLevel;
  inputSchema: ToolInputSchema;
  outputSchema: ToolOutputSchema;
  execute: (input: TInput, context: OperatorContext) => Promise<ToolResult<TOutput>>;
  auditAction: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  simulated: boolean;
  uiBlocks: UIBlock[];
  nextActions: string[];
}

export interface UIBlock {
  type: UIBlockType;
  title: string;
  data: Record<string, unknown>;
}

export interface OperatorContext {
  workspaceId?: string;
  currentPage?: string;
  selectedCreatorId?: string;
  selectedProgramId?: string;
}

export interface OperatorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallRecord[];
  uiBlocks?: UIBlock[];
  nextActions?: string[];
  timestamp: string;
  isLoading?: boolean;
  error?: string;
}

export interface ToolCallRecord {
  toolName: string;
  category: ToolCategory;
  riskLevel: ToolRiskLevel;
  args: Record<string, unknown>;
  success: boolean;
  simulated: boolean;
  durationMs: number;
}

export interface OperatorChatRequest {
  message: string;
  context?: OperatorContext;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface OperatorChatResponse {
  reply: string;
  toolCalls: ToolCallRecord[];
  uiBlocks: UIBlock[];
  nextActions: string[];
  requiresConfirmation?: boolean;
  confirmationPayload?: {
    tool: string;
    args: Record<string, unknown>;
    warning: string;
    confirmationToken?: string;
  };
}

export interface OperatorAuditEvent {
  id: string;
  timestamp: string;
  toolName: string;
  category: ToolCategory;
  riskLevel: ToolRiskLevel;
  argsSummary: string;
  success: boolean;
  simulated: boolean;
  durationMs: number;
  workspaceId?: string;
}

export interface IntentRouteResult {
  toolName: string | null;
  args: Record<string, unknown>;
  clarificationNeeded: boolean;
  clarificationMessage?: string;
  confidence: number;
}
