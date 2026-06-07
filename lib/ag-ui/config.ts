/**
 * AG-UI runtime configuration (AG_UI_IMPLEMENTATION_GUIDE §19).
 *
 * Default LLM is OpenAI gpt-4o-mini to keep inference costs low. Everything is
 * env-driven; no key is ever hardcoded. When no OPENAI_API_KEY is present the
 * runtime falls back to Aura's deterministic operator engine (the safe default),
 * which already grounds every answer in real tools — see lib/ag-ui/runtime.ts.
 */
export const agUIConfig = {
  provider: process.env.AG_UI_PROVIDER ?? "openai",
  model: process.env.AG_UI_MODEL ?? "gpt-4o-mini",
  /** Optional escalation model — never used unless explicitly enabled. */
  escalationModel: process.env.AG_UI_ESCALATION_MODEL ?? "",
  enableEscalation: process.env.AG_UI_ENABLE_MODEL_ESCALATION === "true",
  /** Sensitive tools require explicit human approval unless turned off. */
  requireApproval: process.env.AG_UI_REQUIRE_APPROVAL !== "false",
  debug: process.env.AG_UI_ENABLE_DEBUG === "true",
  openAiKey: process.env.OPENAI_API_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

/** True when a real LLM can be used; otherwise the deterministic engine runs. */
export function llmAvailable(): boolean {
  return agUIConfig.provider === "openai" && agUIConfig.openAiKey.length > 0;
}
