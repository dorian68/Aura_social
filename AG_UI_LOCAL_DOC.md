# AG-UI Local Documentation — Aura

How the AG-UI assistant is wired into Aura, and how to use and extend it.

## 1. What was installed

No new npm dependency. The integration is self-contained:

- A streaming **AG-UI SSE endpoint** that wraps Aura's existing deterministic
  operator engine (36 real tools), so the assistant is grounded in real data.
- A **modern chatbot** in the canonical `Frontend_Aura` UI (vanilla JS, matching
  the existing `aura.css` art direction): intelligent landing, conversation
  management, thinking animation, streamed text, UIBlocks, and human-in-the-loop
  confirmation cards.
- Optional **OpenAI `gpt-4o-mini`** prose layer (env-gated, never hardcoded). With
  no key, the deterministic operator answer is streamed directly.

## 2. Files created / modified

**Backend (Next.js / TypeScript)**
- `lib/ag-ui/types.ts` — AG-UI event + UIBlock types, custom-event allowlist.
- `lib/ag-ui/config.ts` — env-driven config (`AG_UI_*`, default model `gpt-4o-mini`).
- `lib/ag-ui/sanitize.ts` — `sanitizeForAgent()` masks secrets (keys/tokens/etc.).
- `lib/ag-ui/uiBlocks.ts` — maps operator UIBlocks → AG-UI renderer allowlist.
- `lib/ag-ui/llm.ts` — minimal OpenAI streaming via raw `fetch` (no SDK).
- `lib/ag-ui/runtime.ts` — orchestrates the AG-UI event stream over the operator.
- `app/api/ag-ui/run/route.ts` — the SSE endpoint (+ CORS + OPTIONS + GET info).
- `middleware.ts` — added `/api/ag-ui` to protected prefixes.

**Frontend (`Frontend_Aura`, canonical)**
- `js/ag-ui-client.js` — vanilla AG-UI SSE client.
- `js/agent-chat.js` — the chatbot (landing, conversations, streaming, UIBlocks, confirmation).
- `css/agent.css` — chatbot styling using existing design tokens.
- `js/product-shell.js` — now mounts the AG-UI chatbot (was the legacy `operator-widget.js`).

**Tests / docs / config**
- `scripts/smoke-agui.mjs` + `package.json` script `smoke:agui`.
- `test/browser/agent-chat.spec.ts` — Playwright UX E2E.
- `AG_UI_APP_MAP.md`, this file, and AG-UI vars in `.env.example`.

## 3. Endpoint URL

```
POST /api/ag-ui/run        → text/event-stream of AG-UI events
GET  /api/ag-ui/run        → JSON info { model, mode, requireApproval, ... }
OPTIONS /api/ag-ui/run     → CORS preflight
```

Request body (`RunAgentInput`): `{ threadId?, runId?, messages: [{id, role, content}], state?, context?, forwardedProps? }`.
Event stream: `RunStarted → StateSnapshot → StepStarted/Finished → ToolCall* → TextMessageStart/Content*/End → Custom(app.render_component | app.approval.required | app.suggestions) → RunFinished → [DONE]`. Errors arrive as a single `RunError`.

## 4. How to run the project

```bash
# API (Next.js). On Windows, call the binary directly (npm-run-dev can orphan):
node node_modules/next/dist/bin/next dev -p 3009
# Canonical static frontend (separate origin in dev):
WEB_PORT=8080 node scripts/serve-frontend.mjs
```
Open `http://localhost:8080/product/dashboard.html`. The floating Aura logo
button (bottom-right) opens the assistant. In dev the chatbot resolves the API
base via `aura-api.js` (override with `localStorage.aura_api_base`).

> Note: the dev server is run on port **3009** in this environment because a
> separate project repeatedly reclaims :3000 — see `.claude` memory. ngrok points
> at :3009. Any port works; set it consistently.

## 5. How to test the agent

```bash
# Backend SSE smoke (lifecycle, streaming, tools, confirmation, sanitation, 400):
SMOKE_BASE_URL=http://localhost:3009 npm run smoke:agui
# Chatbot UX E2E (needs API on :3170 + frontend on :8080, DEMO_MODE=true):
npm run smoke:browser   # or: npx playwright test test/browser/agent-chat.spec.ts
```

**Manual UX checklist** (matches AG_UI_IMPLEMENTATION_GUIDE §29.19):
open the chat → see the landing (not a mid-conversation); click a suggestion or
type "run a platform health check"; the user bubble is on the right, a thinking
animation shows on the left, then text streams in and a health UIBlock renders;
type "mint points" → a confirmation card appears with Approve/Cancel; use the +
(new) and history (clock) icons to manage conversations; shrink the window to
mobile width → the panel goes full-screen and stays usable.

## 6. How to add a backend tool

The AG-UI runtime reuses the operator registry, so you add a tool the operator
way and it is instantly available to the assistant:

1. Create/extend a file in `lib/operator/tools/*Tools.ts` and call
   `registerTool({ name, description, category, riskLevel, inputSchema, outputSchema, execute, auditAction })`.
2. Set `riskLevel: "confirmation_required"` for sensitive actions — the runtime
   will automatically emit an `app.approval.required` confirmation card.
3. Add an intent in `lib/operator/intentRouter.ts` (keywords + arg extractors) and
   a reply template in `lib/operator/responseRenderer.ts`.
   The new tool's UIBlocks flow through `lib/ag-ui/uiBlocks.ts` unchanged.

## 7. How to add a frontend action

Frontend actions are dispatched from namespaced `Custom` events. In
`Frontend_Aura/js/agent-chat.js`, extend `handleCustom(e, asst)` with a new
`e.name === "app.<action>"` branch. Keep actions controlled (e.g. navigation is
surfaced as a chip, never an automatic redirect). Emit the event from
`lib/ag-ui/runtime.ts` (add the name to `AG_UI_CUSTOM` in `lib/ag-ui/types.ts`).

## 8. How to add an allowlisted generative UIBlock

1. Add the kind to `AgentUIBlockKind` in `lib/ag-ui/types.ts` and to
   `ALLOWED_BLOCKS` in `agent-chat.js` (the client allowlist — unknown kinds are
   skipped, never executed as code).
2. Add a `case "<kind>":` branch in `renderBlock()` in `agent-chat.js`.
3. Produce the block from a tool result via `toAgentUIBlock()` or emit it as a
   `Custom: app.render_component` event in the runtime.

## 9. Enable / disable debug

```env
AG_UI_ENABLE_DEBUG=true
```
Adds an `app.debug` custom event at the end of each run with `{ eventCount,
latencyMs, mode }`. The chatbot ignores it in the UI; read it in the network
stream or a custom handler.

## 10. LLM configuration (cost-aware)

```env
AG_UI_PROVIDER=openai
AG_UI_MODEL=gpt-4o-mini        # default, keeps inference cheap
OPENAI_API_KEY=                # empty → deterministic engine (mock-safe)
AG_UI_REQUIRE_APPROVAL=true
AG_UI_ENABLE_DEBUG=false
AG_UI_ESCALATION_MODEL=        # optional, off by default
AG_UI_ENABLE_MODEL_ESCALATION=false
```
With a key, `gpt-4o-mini` only rephrases the deterministic answer — it cannot
invent facts, tools, or numbers. Without a key (dev or unset), the deterministic
operator answer streams directly and is clearly the active mode (`GET
/api/ag-ui/run` reports `mode`). In production without a key the assistant still
works in deterministic mode; set the key to enable natural-language phrasing.

## 11. Known limitations

- **Art direction / logo**: the chatbot reuses `aura.css` tokens (lime `#B8FF4D`,
  cream text, Space Grotesk/Inter/Space Mono, glass surfaces) and the existing
  `Frontend_Aura/assets/aura-mark.svg` as launcher/avatar/landing mark.
- **Conversation persistence** is `localStorage` (key `aura_agent_conversations_v1`).
  Migration path to a backend table (`Conversation`/`Message` keyed by the
  authenticated identity) is straightforward but not yet implemented.
- **LLM prose** requires `OPENAI_API_KEY`; otherwise deterministic streaming.
- **Approve round-trip** (`/api/operator/execute`) is same-origin in production;
  in split-origin local dev it would need CORS on that route too (the AG-UI run
  route already has it). The confirmation card itself renders and validates in all
  modes; execution is covered by the backend security/journey smokes.
- **Instagram → loyalty** signals are aggregate-only by Graph-API design (no
  per-fan attribution) — see `/api/loyalty/instagram-signals`.
