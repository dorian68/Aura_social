import { agUIConfig } from "./config";

/**
 * Minimal OpenAI chat streaming via raw fetch — no SDK dependency
 * (AG_UI_IMPLEMENTATION_GUIDE §19). Used ONLY to phrase the assistant's prose;
 * all facts, tools and numbers come from Aura's deterministic engine, so the LLM
 * cannot invent data. Returns the full text; calls onDelta for each token chunk.
 *
 * Never logs or returns the API key. Throws on transport/auth errors so the
 * caller can fall back to the deterministic reply.
 */
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamOpenAIChat(
  messages: LLMMessage[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!agUIConfig.openAiKey) throw new Error("OPENAI_API_KEY missing");
  const model = agUIConfig.enableEscalation && agUIConfig.escalationModel ? agUIConfig.escalationModel : agUIConfig.model;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${agUIConfig.openAiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.4, max_tokens: 700 }),
    signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${response.status} ${detail.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.replace(/^data:\s?/, "");
      if (data === "[DONE]") return full;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }
  return full;
}
