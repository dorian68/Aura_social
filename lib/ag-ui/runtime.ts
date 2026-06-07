import crypto from "node:crypto";
import { handleOperatorChat } from "@/lib/operator/operatorOrchestrator";
import type { OperatorContext } from "@/lib/operator/types";
import { agUIConfig, llmAvailable } from "./config";
import { streamOpenAIChat, type LLMMessage } from "./llm";
import { sanitizeForAgent } from "./sanitize";
import { AG_UI_CUSTOM, type AGUIEvent, type RunAgentInput } from "./types";
import { buildConfirmationBlock, buildSuggestionsBlock, toAgentUIBlock } from "./uiBlocks";

type Emit = (event: AGUIEvent) => void;
const ts = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Server-owned system prompt (AG_UI_IMPLEMENTATION_GUIDE §14). Client cannot edit it. */
const SYSTEM_PROMPT = `You are Aura's embedded copilot for a creator-monetization platform (loyalty programs, fan passes, token economy, B2B sponsorship, on-chain rewards).
You help the user understand, navigate and operate the application.
Ground every answer ONLY in the factual result provided to you by the Aura engine — never invent numbers, entities, or outcomes.
Be concise, warm and concrete. Prefer short paragraphs.
For any sensitive action, a confirmation card is shown separately; tell the user to review and approve it.
If something is simulated or limited, say so plainly.`;

export function buildOperatorContext(input: RunAgentInput): OperatorContext {
  const state = (input.state || {}) as Record<string, unknown>;
  const fwd = (input.forwardedProps || {}) as Record<string, unknown>;
  const selected = (state.selectedEntity || {}) as { type?: string; id?: string };
  const pick = (...vals: unknown[]) => vals.find((v) => typeof v === "string" && v) as string | undefined;

  return {
    workspaceId: pick(state.workspaceId, fwd.workspaceId) || undefined,
    currentPage: pick(state.pathname, state.route, fwd.currentPage) || undefined,
    selectedCreatorId: selected.type === "creator" ? selected.id : pick(state.selectedCreatorId, fwd.selectedCreatorId),
    selectedProgramId: selected.type === "program" ? selected.id : pick(state.selectedProgramId, fwd.selectedProgramId),
  };
}

/**
 * Runs Aura's deterministic operator and emits the AG-UI event stream
 * (lifecycle → tools → streamed text → UIBlocks → approval → suggestions).
 *
 * The operator engine produces the facts (reply text, tool calls, UIBlocks,
 * confirmation requirement). When an OpenAI key is configured, gpt-4o-mini only
 * re-phrases the prose, grounded on that deterministic reply, so it cannot
 * fabricate data. Without a key, the deterministic reply is streamed directly.
 */
export async function runApplicationAgent(input: RunAgentInput, emit: Emit, signal?: AbortSignal): Promise<void> {
  const userMessage =
    [...input.messages].reverse().find((m) => m.role === "user")?.content?.toString().trim() || "";
  const context = buildOperatorContext(input);

  emit({
    type: "StateSnapshot",
    snapshot: sanitizeForAgent({
      route: context.currentPage || "/",
      context,
      runtime: { provider: agUIConfig.provider, model: agUIConfig.model, mode: llmAvailable() ? "openai" : "deterministic" },
    }),
    timestamp: ts(),
  });

  if (!userMessage) {
    return streamText("How can I help you operate Aura today?", `msg_${crypto.randomUUID()}`, emit, signal);
  }

  const history = input.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(0, -1)
    .slice(-10)
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content || "") }));

  emit({ type: "StepStarted", stepName: "route_and_execute", timestamp: ts() });
  const result = await handleOperatorChat({ message: userMessage, context, history });
  emit({ type: "StepFinished", stepName: "route_and_execute", timestamp: ts() });

  // Tool-call visibility
  for (const call of result.toolCalls) {
    const toolCallId = `tool_${crypto.randomUUID()}`;
    emit({ type: "ToolCallStart", toolCallId, toolCallName: call.toolName, timestamp: ts() });
    emit({ type: "ToolCallArgs", toolCallId, delta: JSON.stringify(sanitizeForAgent(call.args || {})), timestamp: ts() });
    emit({ type: "ToolCallEnd", toolCallId, timestamp: ts() });
    emit({
      type: "ToolCallResult",
      messageId: `toolmsg_${crypto.randomUUID()}`,
      toolCallId,
      content: JSON.stringify({ success: call.success, simulated: call.simulated, durationMs: call.durationMs }),
      role: "tool",
      timestamp: ts(),
    });
  }

  // Streamed assistant prose
  const messageId = `msg_${crypto.randomUUID()}`;
  emit({ type: "TextMessageStart", messageId, role: "assistant", timestamp: ts() });
  if (llmAvailable()) {
    try {
      const prompt: LLMMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        {
          role: "user",
          content: `User asked: "${userMessage}"\n\nAura engine factual result to ground your answer:\n${result.reply}\n\nRephrase this into a concise, helpful answer. Do not add facts that are not present above.`,
        },
      ];
      const out = await streamOpenAIChat(prompt, (delta) => emit({ type: "TextMessageContent", messageId, delta, timestamp: ts() }), signal);
      if (!out.trim()) await streamDeltas(result.reply, messageId, emit, signal);
    } catch {
      await streamDeltas(result.reply, messageId, emit, signal); // graceful fallback to deterministic prose
    }
  } else {
    await streamDeltas(result.reply, messageId, emit, signal);
  }
  emit({ type: "TextMessageEnd", messageId, timestamp: ts() });

  // Rich UIBlocks
  for (const block of result.uiBlocks) {
    emit({ type: "Custom", name: AG_UI_CUSTOM.RENDER_BLOCK, value: toAgentUIBlock(block), timestamp: ts() });
  }

  // Human-in-the-loop approval for sensitive actions
  if (result.requiresConfirmation && result.confirmationPayload) {
    emit({ type: "Custom", name: AG_UI_CUSTOM.APPROVAL_REQUIRED, value: buildConfirmationBlock(result.confirmationPayload), timestamp: ts() });
  }

  // Quick-action suggestions
  const suggestions = buildSuggestionsBlock(result.nextActions);
  if (suggestions) emit({ type: "Custom", name: AG_UI_CUSTOM.SUGGESTIONS, value: suggestions, timestamp: ts() });
}

/** Stream a single complete string as a short helper message (no tool routing). */
async function streamText(text: string, messageId: string, emit: Emit, signal?: AbortSignal) {
  emit({ type: "TextMessageStart", messageId, role: "assistant", timestamp: ts() });
  await streamDeltas(text, messageId, emit, signal);
  emit({ type: "TextMessageEnd", messageId, timestamp: ts() });
}

/**
 * Chunk a finished string into word-grouped deltas so the client renders it
 * progressively. Not an artificial slow typewriter — small groups, tiny gap,
 * capped so long replies still feel instant.
 */
async function streamDeltas(text: string, messageId: string, emit: Emit, signal?: AbortSignal) {
  const tokens = text.match(/\S+\s*/g) || [text];
  let buffer = "";
  let emitted = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (signal?.aborted) break;
    buffer += tokens[i];
    if (i % 3 === 2 || i === tokens.length - 1) {
      emit({ type: "TextMessageContent", messageId, delta: buffer, timestamp: ts() });
      buffer = "";
      if (emitted++ < 120) await sleep(12);
    }
  }
}
