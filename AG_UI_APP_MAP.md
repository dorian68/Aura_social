# AG-UI App Map — Aura

Cartography of the Aura application as connected to the AG-UI layer
(per AG_UI_IMPLEMENTATION_GUIDE §11). Generated during the AG-UI integration.

## 1. Stack detected

| Layer | Technology |
|---|---|
| Backend / API | Next.js 15 App Router (TypeScript, ESM), Node runtime |
| Auth | Edge middleware (`middleware.ts`) — Bearer / `x-aura-api-token` / cookie, role-based (`viewer < creator < operator < admin`), DEMO_MODE + dev bypass, fail-closed in prod |
| Persistence | SQLite (default) / memory / local JSON, pinned on `globalThis` under `next dev` |
| Canonical frontend | **`Frontend_Aura/`** — static, vanilla JS + `aura.css` (the React app under `app/*`/`components/*` is legacy) |
| Agent engine | Deterministic **Aura Operator** (`lib/operator/`) — intent router + 36-tool registry, no LLM by default |
| Blockchain | Hardhat / EVM, mock fallback when no node |
| LLM (new) | Optional OpenAI `gpt-4o-mini` via env; deterministic engine is the default |

## 2. Main routes / pages

- Static product pages: `Frontend_Aura/product/{dashboard,loyalty,fanpass,b2b,token-economy,workspace,script}.html` + landing `Frontend_Aura/index.html`.
- API (selection): `/api/operator/{chat,execute,tools}`, `/api/agent/*`, `/api/b2b-agent/*`, `/api/loyalty/*` (incl. new `instagram-signals`), `/api/rewards`, `/api/fan-pass`, `/api/token-economy/*`, `/api/workspace/*`, `/api/meta/*`, `/api/blockchain/*`, `/api/system/health`, and **new `/api/ag-ui/run`**.

## 3. Important components / stores

- Operator: `lib/operator/operatorOrchestrator.ts` (`handleOperatorChat`), `intentRouter.ts`, `toolRegistry.ts`, `toolExecutor.ts`, `safety.ts` (confirmation tokens), `responseRenderer.ts`, `tools/*Tools.ts`.
- Loyalty: `lib/loyalty/{loyaltyEngine,loyaltyRules,rewardEngine,fanPassEngine,store,types}.ts`.
- B2B: `lib/b2b-agent/{orchestrator,paymentSimulator,store,types}.ts`.
- Meta/IG: `lib/meta/{metaClient,insightService,privateAnalytics,tokenStore}.ts`.
- Workspace/audit: `lib/workspace/store.ts`.
- Frontend shell: `Frontend_Aura/js/product-shell.js` (mounts sidebar + assistant + IG connect), `aura-api.js` (API base resolution).

## 4. Data models (conceptual)

- `LoyaltyProgram`, `LoyaltyRule`, `FanProfile`, `LoyaltyTransaction`, `Reward`, `FanPass` (`lib/loyalty/types.ts`).
- `CreatorProfile` keyed `creator_ig_<igUserId>`.
- B2B `SponsoredRewardCampaign`, `PartnershipOpportunity`, `LocalBusiness`.
- `ConnectedInstagramAccount` (aggregate IG signals only — no per-fan identity).

## 5. Permissions / roles

`viewer` (GET) → `creator` (loyalty/rewards/fan-pass/agent writes) → `operator` (operator/ag-ui/b2b) → `admin` (meta runtime-config, test, debug). Enforced in `middleware.ts`.

## 6. AG-UI tools connected (backend)

The AG-UI runtime wraps the **existing operator registry** rather than duplicating it, so all 36 operator tools are reachable through one streamed entry point. Categories: `workspace, loyalty, fan_pass, token_economy, recommendations, b2b_agent, contracts, navigation`. Representative real tools:

- `runPlatformHealthCheck`, `getWorkspaceState`, `getIntegrationHealth`, `getAuditTrail` (workspace)
- `getLoyaltyStats`, `getTopFans`, `listRewards`, `createReward`, `simulatePointsAward` (loyalty)
- `listFanPasses`, `createFanPass`, `simulateFanPassLaunch` (fan_pass)
- `explainTokenReadiness`, `simulateTokenEconomy`, `analyzeTokenEconomyRisk` (token_economy)
- `generateRecommendations`, `generateCampaignDraft`, `generateDMDraft` (recommendations)
- `runB2BExpansionAgent`, `discoverLocalBusinesses`, `simulateSMEPayment` (b2b_agent)
- `getContractStatus`, `simulateMintPoints`*, `simulateMintFanPass`* (contracts — *confirmation_required)

The guide's generic tool names map onto these: `get_app_map`→`/api/operator/tools`, `get_current_user_context`→middleware identity + `getWorkspaceState`, `read_entity`/`search_entities`→`getLoyaltyStats`/`getTopFans`/`listRewards`, `create_entity`→`createReward`/`createFanPass`, `trigger_workflow`→`runB2BExpansionAgent`/`runPlatformHealthCheck`, `explain_current_screen`→state-snapshot + reply grounded on `currentPage`.

## 7. AG-UI frontend actions connected

- `navigate` (surfaced as a chip, never auto-redirect), `showToast` (ignored unless needed), `refreshData` via re-query, `setFilter`/`highlight` reserved.
- Real connected actions: **send message → stream**, **approve/reject sensitive action** (→ `/api/operator/execute` with server confirmation token), **run quick-action suggestion chips**, **new/switch/delete conversation**.

## 8. Files created for AG-UI

Backend: `lib/ag-ui/{types,config,sanitize,uiBlocks,llm,runtime}.ts`, `app/api/ag-ui/run/route.ts`, `middleware.ts` (added `/api/ag-ui` to protected prefixes).
Frontend: `Frontend_Aura/js/ag-ui-client.js`, `Frontend_Aura/js/agent-chat.js`, `Frontend_Aura/css/agent.css`, `Frontend_Aura/js/product-shell.js` (mounts the new chatbot).
Tests/docs: `scripts/smoke-agui.mjs`, `test/browser/agent-chat.spec.ts`, `AG_UI_APP_MAP.md`, `AG_UI_LOCAL_DOC.md`, `.env.example` (AG-UI vars).

## 9. Not connected (and why)

- **Per-fan Instagram attribution**: the Graph API only exposes aggregate signals; individual likers/commenters are not available. The loyalty bridge (`/api/loyalty/instagram-signals`) is therefore aggregate-only and labelled as such.
- **Real payments / outreach / Google Places discovery**: gated OFF behind explicit flags; `production:check` and the commercial audit honestly report PARTIAL until real providers are wired.
- **JON / browser-automation agent**: not present in the repo (see `docs/jon-chrome-extension-requirements.md`).
- The `/api/operator/execute` approval round-trip is same-origin in production; in split-origin local dev it needs the operator route's CORS (the AG-UI run route already has it).
