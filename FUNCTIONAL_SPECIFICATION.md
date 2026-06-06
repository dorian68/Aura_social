# Aura Functional Specification

## 1. Product Overview

Aura is a creator monetization platform that combines Instagram analysis, loyalty programs, rewards, fan passes, agentic recommendations, B2B partner campaign simulation, workspace readiness and blockchain contract infrastructure.

The MVP is backend-first and mock-safe. Real external side effects must remain disabled unless explicitly configured and tested.

## 2. Target Users

- Creator using an Instagram Business or Creator account.
- Creator operator or agency managing monetization workflows.
- Local business buyer participating in sponsored reward campaigns.
- Platform operator validating integrations, safety and campaign economics.

## 3. User Roles

- Creator: connects Instagram, reviews analytics, approves campaigns and rewards.
- Operator: manages workspace, integrations, loyalty state and agent actions.
- Fan: earns points, redeems rewards and may hold a fan pass.
- Local business: funds partner campaigns and sponsored rewards.
- Developer/admin: configures providers, runs CLI diagnostics and production checks.

## 4. Core User Journeys

### Journey A - Analyze a creator account

1. User opens the analyzer.
2. User submits an Instagram username or uses a connected account.
3. Backend returns either official Graph API data, private insights, or an explicit configuration/mock status.
4. User receives profile, media, engagement and recommendations.

### Journey B - Operate loyalty and rewards

1. User opens the dashboard or loyalty page.
2. User inspects active program, rules, fans, tiers and ledger.
3. User awards or redeems points through API/CLI.
4. State persists locally unless memory mode is selected.
5. Rewards and balances update coherently.

### Journey C - Launch fan-pass economics

1. User inspects fan-pass offers.
2. Backend simulates launch economics from follower and conversion assumptions.
3. User sees supply, holder count, price and estimated revenue.
4. No on-chain mint occurs unless live writes are explicitly enabled and tested.

### Journey D - Run B2B expansion agent

1. User starts the B2B agent for a location and campaign budget.
2. Backend discovers mock local businesses.
3. Backend scores fit against creator and loyalty context.
4. Backend creates opportunity, pitch draft, sponsored campaign and simulated payment split.
5. User can inspect platform commission and fan reward budget.

### Journey E - Use agentic recommendation layer

1. User requests recommendations.
2. Deterministic agent generates recommendations and drafts.
3. User approves, rejects or mock-executes recommendations.
4. Real actions remain disabled unless explicitly integrated and approved.

### Journey F - Validate workspace readiness

1. User or developer calls health/workspace endpoints or pages.
2. Backend reports integration readiness, safe mode, missing config and audit events.
3. Developer runs CLI smoke tests to reproduce readiness.

## 5. Functional Modules

- Instagram Analyzer and private insights.
- Meta OAuth and runtime configuration.
- Workspace control plane and audit trail.
- Loyalty engine, rules, fans, ledger and tiers.
- Rewards catalog and redemption.
- Fan-pass builder and simulation.
- Token economy simulator.
- Agentic recommendation and campaign draft engine.
- B2B expansion agent.
- Operator chat and tool registry.
- Blockchain contract status, ABI export and local contract tests.
- Production health and security gate.

## 6. Detailed Feature List

### Instagram and Meta

- Public creator analysis via official Instagram Graph API when configured.
- Mock mode for local development.
- Meta login start/callback routes.
- Private insights route for authorized Instagram Business/Creator accounts.
- Runtime configuration for local prototype setup.
- Meta debug logs with secrets redacted.

### Loyalty, rewards and fan passes

- Create/read loyalty programs.
- Award points from actions.
- Redeem points.
- Calculate stats, tiers and segments.
- Read and validate reward eligibility.
- Simulate fan-pass revenue and supply.
- Simulate token economy readiness.

### B2B agent

- Discover mock local businesses.
- Score partner fit.
- Generate opportunity and pitch draft.
- Simulate sponsored campaign payment economics.
- Persist B2B runs, opportunities and campaigns.

### Agent and operator

- Generate deterministic recommendations.
- Approve, reject or mock-execute recommendation actions.
- Route operator intents to tools.
- Render structured tool results.

### Readiness and infrastructure

- System health endpoint.
- Workspace state and audit events.
- API auth middleware for sensitive routes.
- Blockchain ABI status.
- Docker smoke test.

## 7. Inputs and Outputs

### Common API response envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": ""
  }
}
```

### Primary inputs

- Instagram username.
- Meta OAuth authorization code or access token.
- Loyalty program ID, fan ID, action type and points/reward input.
- B2B location, categories and campaign budget.
- Recommendation ID and action.
- Workspace audit event.
- Environment variables for providers and safety gates.

### Primary outputs

- Creator profile and media analytics.
- Private insight overview and recommendations.
- Loyalty stats, ledger, fans and reward eligibility.
- Fan-pass and token-economy simulations.
- Agent recommendations and campaign drafts.
- B2B opportunities, pitch drafts, campaigns and payment split.
- Integration readiness and production blockers.

## 8. State Transitions

- Loyalty program: draft -> active -> paused.
- Reward: draft -> active -> paused -> archived.
- Fan pass: draft -> active -> paused -> sold_out.
- Agent recommendation: pending -> approved | rejected | executed.
- B2B business: mock_discovered -> qualified | rejected.
- B2B opportunity: draft -> approved -> simulated_paid -> archived.
- Sponsored campaign: draft -> payment_simulated -> approved_mock -> completed.
- Outreach draft: draft -> approved_mock -> sent_disabled.
- Agent run: started -> completed | failed.

State changes must be represented in backend state first. UI state alone is not sufficient.

## 9. Data Model

Core local state is stored in:

- `data/aura-state/loyalty-state.json`
- `data/aura-state/b2b-agent-state.json`

Core domain entities:

- CreatorProfile
- LoyaltyProgram
- LoyaltyRule
- FanProfile
- LoyaltyTransaction
- Reward
- FanPass
- TokenEconomy
- AgentRecommendation
- Campaign
- LocalBusiness
- BusinessFitScore
- PartnershipOpportunity
- SponsoredRewardCampaign
- OutreachDraft
- AgentRun
- Workspace
- ConnectedAccount
- IntegrationReadiness
- AuditEvent

Meta access tokens are prototype session memory only and must not be persisted to disk.

## 10. API Contracts

Representative routes:

- `GET /api/system/health`
- `GET /api/workspace/state`
- `POST /api/workspace/audit`
- `POST /api/analyze-instagram`
- `GET /api/auth/meta/start`
- `GET /api/private-insights`
- `POST /api/meta/runtime-config`
- `GET /api/meta/config`
- `GET /api/meta/debug/logs`
- `POST /api/loyalty/program`
- `GET /api/loyalty/stats`
- `POST /api/loyalty/award`
- `POST /api/loyalty/redeem`
- `GET /api/rewards`
- `POST /api/rewards/redeem`
- `GET /api/fan-pass`
- `POST /api/fan-pass/simulate`
- `POST /api/token-economy/simulate`
- `POST /api/agent/recommendations`
- `POST /api/agent/recommendations/action`
- `POST /api/b2b-agent/run`
- `GET /api/b2b-agent/runs`
- `GET /api/blockchain/status`
- `POST /api/operator/chat`
- `POST /api/operator/execute`

All non-public sensitive routes must pass through the API auth gate outside explicit demo mode.

## 11. Business Rules

- Mock/demo data must be labeled and must not be presented as real.
- No scraping or credential collection is allowed for Instagram.
- Private insights require an authorized Meta/Instagram account.
- B2B discovery is mock-only until a real Google Places adapter exists.
- Outreach drafts require approval and must not be sent in the current MVP.
- Payments are simulated unless `AURA_ALLOW_REAL_PAYMENTS=true` and a tested provider exists.
- On-chain writes are disabled unless `AURA_ALLOW_ONCHAIN_WRITES=true`, configured contract addresses exist and smoke tests pass.
- Loyalty points are not financial instruments.
- Fan passes represent access or membership, not speculative assets.
- Agent recommendations cannot perform external side effects silently.

## 12. Error States

- Missing Meta configuration.
- Missing or invalid access token.
- Meta permissions missing or no managed pages.
- Invalid JSON body.
- Unknown program, fan, reward or opportunity ID.
- Insufficient points for redemption.
- Reward out of stock.
- Protected route called without valid API token.
- External provider configured but adapter disabled or incomplete.
- Local persistence write/read failure.

Errors must use the structured failure envelope and should identify the failing step when relevant.

## 13. Empty States

- No connected Instagram account.
- No public discovery source.
- No private insights available.
- No loyalty fans or ledger transactions.
- No rewards or fan passes configured.
- No B2B opportunities generated.
- No agent recommendations pending.
- No audit events.
- No blockchain contract addresses configured.

Empty states must say what is missing and what the next safe action is.

## 14. Mock/Demo Mode Rules

- `MOCK_META=true` may simulate OAuth and insights locally.
- B2B agent uses mock local businesses only.
- Agent mode is deterministic/rules by default.
- Payment and outreach side effects are simulated.
- Mock mode is acceptable for demo and smoke tests only.
- Production readiness cannot be YES while core monetization claims depend on unlabeled simulation.

## 15. Authentication and Permissions

- Sensitive API prefixes are protected by `middleware.ts`.
- `DEMO_MODE=true` is an explicit bypass.
- With `AURA_API_TOKEN` configured, protected routes require bearer token, `x-aura-api-token` or cookie token.
- In production with no configured token, protected routes must fail closed.
- Public exact routes are limited to health and public Meta config.
- OAuth routes remain public because the browser redirect flow cannot provide the API token.

## 16. CLI-Testability Requirements

Every critical feature must be testable from CLI without manual UI inspection.

Required command categories:

- `npm run smoke:platform`
- `npm run smoke:security`
- `npm run docker:smoke`
- `npm run debug:workspace`
- `npm run debug:meta-flow`
- `npm run debug:loyalty`
- `npm run debug:token-economy`
- `npm run debug:agent`
- `npm run debug:b2b-agent`
- `npm run debug:operator`
- `npm run debug:contracts`
- `npm run contracts:test`
- `npm run typecheck`
- `npm run build`

Protocol commands now available in `package.json`:

- `npm run smoke:journey`
- `npm run smoke:business`
- `npm run audit:commercial`
- `npm run production:check`

These commands are part of the product contract. `smoke:business`, `audit:commercial` and `production:check` may intentionally return non-PASS while paid-production blockers remain unresolved; that failure is useful evidence, not a script defect.

## 17. Acceptance Criteria

### Platform health

- `GET /api/system/health` returns `success: true`.
- Response includes environment, workspace, Meta setup, loyalty, B2B and blockchain status.
- Secrets are not exposed.

### Instagram analyzer

- Missing real configuration returns an explicit error, not silent scraping.
- Mock mode is clearly represented as mock.
- Real mode uses official Graph API only.
- CLI debug can diagnose token, scope and discovery failures.

### Private insights

- Authorized mock flow returns media and recommendations in smoke mode.
- Real flow must validate account ownership and permissions.
- Tokens are redacted in logs and not persisted to disk.

### Loyalty engine

- Awarding points changes fan balance and ledger.
- Redeeming points decreases balance and records transaction.
- Unknown fan/program and insufficient points return structured errors.
- State persists in local mode.

### Rewards and fan passes

- Reward eligibility returns eligible, reason and missing points.
- Stock and redemption count are respected.
- Fan-pass simulation returns estimated holders, revenue and supply remaining.

### Agent recommendations

- Recommendations are generated deterministically in rules mode.
- Approve/reject/mock execute changes recommendation status.
- `execute_mock` performs zero external actions.

### B2B expansion

- B2B run returns mock businesses, scores, best opportunity, pitch, campaign and payment split.
- `meta.externalCalls` remains `0` in MVP mode.
- Platform commission and fan reward budget are calculated from campaign budget.

### Main customer activation

- `npm run smoke:journey` reproduces the main monetization loop from health/readiness through loyalty mutations, reward eligibility, fan-pass economics, agent recommendations, B2B campaign economics and blockchain ABI status.
- The journey makes backend state changes observable after mutation.
- Mock payment and provider states are explicit.

### Business/client mystere acceptance

- `npm run smoke:business` or `npm run audit:commercial` produces clarity, trust, value, commercial readiness and would-pay scores.
- A paid-production PASS is not allowed while B2B discovery, outreach, payments or attribution remain only simulated.
- A demo/beta PARTIAL verdict is acceptable only if simulation and disabled side effects are clearly labeled.

### Workspace and audit

- Workspace state lists integration readiness entries.
- Audit route persists a sanitized audit event.
- Sensitive workspace route is blocked without auth when token gate is active.

### Blockchain contracts

- ABI status is readable.
- Hardhat contract tests pass locally.
- Live writes are off unless explicitly enabled.

## 18. Production Readiness Criteria

Aura can be production-ready only when:

- authentication and authorization are enforced for sensitive routes;
- all required environment variables are documented;
- secrets are redacted from logs and responses;
- no silent mock fallback exists in real mode;
- state persistence is durable enough for target usage;
- real payment, outreach and provider integrations have CLI smoke tests;
- production build passes;
- security smoke passes with `AURA_API_TOKEN`;
- business smoke confirms that the main journey communicates value, trust and clear next steps;
- limitations around tokenization, simulation and financial claims are visible.
