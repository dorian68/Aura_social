# Aura Functional Specification

## 1. Product Overview

Aura is a **Creator Superfan OS** — a cross-platform loyalty and rewards operating system that helps creators identify their most engaged fans, activate them through challenges and rewards, and turn their community into measurable revenue through partner campaigns.

**Primary product:** Superfan Club — a branded fan club page with points, challenges, leaderboard, rewards and fan signup that any creator can launch for free in 5 minutes.

**Secondary product:** Partner campaign engine — QR/coupon attribution connecting fan activity to local business traffic.

**Infrastructure:** Instagram analysis, B2B agent, blockchain loyalty layer, operator workspace, AG-UI chat agent.

**Platform strategy:** MVP = Instagram-first. Architecture = cross-platform (Instagram, TikTok, YouTube, Twitch, Discord, newsletter, offline). The product must never hardcode Instagram — all platform references use the `PlatformAccount` abstraction.

The MVP is backend-first and mock-safe. Real external side effects must remain disabled unless explicitly configured and tested.

## 2. Target Users

- Creator on any platform (Instagram, TikTok, YouTube, Twitch, Discord, newsletter, events) who wants to identify and activate their real fans.
- Creator using an Instagram Business or Creator account who wants to monetize beyond ad revenue.
- Creator operator or agency managing monetization workflows for multiple creators.
- Fan who wants to earn status and rewards for engaging with their favorite creator.
- Local business buyer participating in fan-activated sponsored campaigns with QR attribution.
- Platform operator validating integrations, safety and campaign economics.

## 3. User Roles

- Creator: launches Superfan Club, creates challenges and rewards, reviews fan dashboard, approves campaigns.
- Fan: signs up to club, earns points, completes challenges, redeems rewards, refers friends.
- Operator: manages workspace, integrations, loyalty state and agent actions.
- Local business: funds partner campaigns, receives QR/coupon attribution reports.
- Developer/admin: configures providers, runs CLI diagnostics and production checks.

## 4. Core User Journeys

### Journey G - Launch a Superfan Club (P0)

1. Creator visits Aura dashboard and clicks "Launch my Superfan Club".
2. Creator sets club name, description, brand color and cover image.
3. Creator configures initial challenges (e.g. "Follow on Instagram", "Share a story", "Visit our partner").
4. Creator sets initial rewards (e.g. DM session, early merch access, partner offer).
5. Aura generates a public club page at `/club/:slug`.
6. Creator shares the club URL with their audience.
7. Fans visit the page, see the leaderboard and sign up with their email.
8. Fans earn welcome points (50 pts) automatically on signup.
9. Creator sees fan activity in real-time dashboard.

### Journey H - Fan earns points and redeems a reward (P0)

1. Fan signs up to a Superfan Club via club page or referral link.
2. Fan sees available challenges and picks one (e.g. "Visit our partner store and scan the QR code").
3. Fan completes the challenge and submits proof (scan, screenshot, or honor).
4. Points are awarded (auto for QR/coupon, after creator approval for manual).
5. Fan sees their rank on the leaderboard update.
6. Fan browses reward catalog and redeems a reward with their points.
7. Creator is notified and marks the reward as fulfilled.

### Journey I - Creator runs a partner campaign (P0)

1. Creator navigates to "Partner Campaigns" in dashboard.
2. Creator enters partner business name, city, campaign budget, challenge and reward.
3. Aura generates a unique QR code for the partner business.
4. Creator sends QR code to partner; partner prints/displays it in-store.
5. Creator announces challenge to Superfan Club.
6. Fans visit the partner, scan the QR code, earn points.
7. Creator sees real-time scan count on dashboard.
8. After campaign ends, creator generates sponsor-ready report with QR scan count, unique fans, estimated value.
9. Creator shares report with partner; partner pays campaign fee.
10. Aura records commission.

### Journey A - Analyze a creator account

1. User opens the analyzer.
2. User submits an Instagram username or uses a connected account.
3. Backend returns either official Graph API data, private insights, or an explicit configuration/mock status.
4. User receives profile, media, engagement and recommendations.

### Journey B - Operate loyalty and rewards

1. User opens the dashboard or loyalty page.
2. User inspects active program, rules, fans, tiers and ledger.
3. User awards or redeems points through API/CLI.
4. State persists transactionally in SQLite unless memory mode is selected.
5. Rewards and balances update coherently.

### Journey C - Launch fan-pass economics

1. User inspects fan-pass offers.
2. Backend simulates launch economics from follower and conversion assumptions.
3. User sees supply, holder count, price and estimated revenue.
4. No on-chain mint occurs unless live writes are explicitly enabled and tested.

### Journey D - Run B2B expansion agent

1. User starts the B2B agent for a location and campaign budget.
2. Backend discovers mock local businesses by default or Google Places businesses when the real provider is explicitly enabled.
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

### P0 — Superfan Club (build priority)

- Public Creator Club Page (fan-facing, public URL).
- Fan Signup (email, optional WhatsApp, referral tracking).
- Points Ledger (balance, transactions, audit trail).
- Challenges (creator-set actions, auto/manual/QR verification).
- Rewards (points-backed catalog, redemption, fulfillment).
- Leaderboard (ranked fan list, period filter, tier badges).
- Creator Dashboard (community stats, fan list, challenge/reward activity).
- QR / Coupon Tracking (partner visit attribution).
- Referral Links (fan-to-fan growth, auto-points on successful referral).
- Sponsor-Ready Report (partner pitch document, one-click generate).

### P1 — Platform and analytics

- Instagram Analyzer and private insights.
- Meta OAuth and runtime configuration.
- Cross-platform PlatformAccount abstraction (Instagram, TikTok, YouTube, Twitch, Discord, newsletter, offline).
- Workspace control plane and audit trail.

### P2 — Monetization infrastructure

- Fan-pass builder and simulation.
- Token economy simulator.
- Agentic recommendation and campaign draft engine.
- B2B expansion agent (Google Places discovery, outreach, Stripe Checkout).
- Operator chat and tool registry (AG-UI streaming).
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

- Discover mock local businesses or provider-backed Google Places businesses.
- Score partner fit.
- Generate opportunity and pitch draft.
- Simulate sponsored campaign economics or create a guarded Stripe Checkout.
- Verify signed Stripe webhooks and persist provider-backed payment state.
- Approve outreach drafts before dry-run or provider delivery.
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
- B2B opportunity: draft -> approved -> payment_pending -> paid | simulated_paid -> archived.
- Sponsored campaign: draft -> payment_pending -> paid | payment_simulated -> approved_mock -> completed.
- Outreach draft: draft -> approved -> sent | failed. Dry-run delivery does not mark the draft as externally sent.
- Agent run: started -> completed | failed.

State changes must be represented in backend state first. UI state alone is not sufficient.

## 9. Data Model

Core state is stored in SQLite by default:

- `data/aura-state/aura.sqlite`
- versioned migrations in `lib/storage/migrations.ts`
- state documents use optimistic revisions to reject stale concurrent writes
- provider events, payments and outreach deliveries use dedicated relational tables

Legacy JSON files are imported once when a SQLite state document does not exist. `AURA_PERSISTENCE=local_json` is compatibility-only and is not the production default.

Core domain entities:

**Superfan Club (new, P0):**
- Creator
- PlatformAccount (platform enum: instagram | tiktok | youtube | twitch | discord | newsletter | whatsapp | offline | other)
- Fan
- CreatorCommunity
- Membership
- PointsLedger
- PointsTransaction
- Challenge
- ChallengeCompletion
- Reward (extended from existing)
- RewardRedemption
- Referral
- Partner
- Campaign (extended from existing)
- QRCode
- CouponCode

**Existing (P1/P2):**
- CreatorProfile
- LoyaltyProgram
- LoyaltyRule
- FanProfile
- LoyaltyTransaction
- FanPass
- TokenEconomy
- AgentRecommendation
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

**Superfan Club (P0, new):**
- `GET /api/club/:slug` — public club page data
- `POST /api/club/:slug/join` — fan signup with optional referral code
- `GET /api/club/:slug/leaderboard?period=alltime|monthly|weekly`
- `GET /api/club/:slug/challenges` — active challenges
- `GET /api/club/:slug/rewards` — active rewards
- `POST /api/challenge/:id/complete` — fan submits completion
- `POST /api/reward/:id/redeem` — fan redeems reward
- `GET /api/fan/:fanId/points?communityId=xxx`
- `GET /api/fan/:fanId/transactions?communityId=xxx`
- `GET /api/fan/:fanId/referral-link?communityId=xxx`
- `GET /api/qr/:code` — QR redirect + scan logging
- `POST /api/coupon/redeem` — coupon redemption
- `GET /api/admin/dashboard/:communityId`
- `GET /api/admin/fans/:communityId`
- `POST /api/admin/challenges` — creator creates challenge
- `PATCH /api/admin/challenges/:id`
- `POST /api/admin/completions/:id/approve`
- `POST /api/admin/rewards` — creator creates reward
- `PATCH /api/admin/rewards/:id`
- `POST /api/admin/redemptions/:id/fulfill`
- `POST /api/admin/qr` — generate QR code for campaign
- `GET /api/admin/qr/:campaignId/stats`
- `GET /api/admin/report/:communityId?format=json|pdf`
- `POST /api/admin/report/:communityId/share`
- `POST /api/admin/points/award` — manual points award
- `POST /api/admin/points/deduct` — manual points deduction

**Existing:**
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
- `POST /api/b2b-agent/outreach/{id}/approve`
- `POST /api/b2b-agent/outreach/{id}/send`
- `POST /api/payments/stripe/checkout`
- `POST /api/payments/stripe/webhook`
- `GET /api/payments/stripe/status`
- `GET /api/b2b-agent/runs`
- `GET /api/blockchain/status`
- `POST /api/operator/chat`
- `POST /api/operator/execute`

All non-public sensitive routes must pass through the API auth gate outside explicit demo mode.

## 11. Business Rules

- Mock/demo data must be labeled and must not be presented as real.
- No scraping or credential collection is allowed for Instagram.
- Private insights require an authorized Meta/Instagram account.
- B2B discovery is mock by default. Google Places requires `B2B_DISCOVERY_PROVIDER=google_places`, a key and `AURA_ALLOW_REAL_DISCOVERY=true`; configuration failures never fall back silently.
- Outreach drafts require explicit approval. Delivery defaults to dry-run; Resend delivery requires credentials and `OUTREACH_SENDING_ENABLED=true`.
- Payments are simulated in the demo journey. Stripe Checkout requires an explicit payment gate and test credentials; webhook state changes require a valid Stripe signature.
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
- `AURA_API_KEYS_JSON` maps API identities to roles and allowed workspaces.
- Roles are `viewer`, `creator`, `operator` and `admin`; route and method policies enforce minimum roles.
- `AURA_API_TOKEN` remains a legacy admin-token fallback.
- In production with no configured token, protected routes must fail closed.
- Public exact routes are limited to health and public Meta config.
- OAuth routes remain public because the browser redirect flow cannot provide the API token.

## 16. CLI-Testability Requirements

Every critical feature must be testable from CLI without manual UI inspection.

Required command categories:

- `npm run smoke:platform`
- `npm run smoke:security`
- `npm run smoke:authz`
- `npm run smoke:negative`
- `npm run smoke:persistence`
- `npm run smoke:integrations`
- `npm run smoke:browser`
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
- State persists in SQLite mode and stale concurrent writes are rejected.

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
- B2B `platformRevenue` is derived from persisted sponsored campaign commissions, not from an increment-only counter.
- Dashboard and health revenue responses identify the platform revenue source as `campaign_commissions`.
- Provider-backed revenue is reported separately from simulated campaign commission revenue.
- Google Places failures are explicit and never silently replaced by mock businesses.
- Outreach delivery requires prior approval and dry-run performs zero external calls.

### Payments

- Stripe Checkout refuses to run unless the explicit payment gate and provider configuration are present.
- Live Stripe keys are rejected unless live mode is separately enabled.
- Stripe webhooks verify the signature against the raw request body.
- Paid webhook amount and currency must match the referenced B2B opportunity.
- Replayed webhook events are idempotent.
- A paid webhook persists the payment and marks the related opportunity and campaign paid.

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
- Audit actor, role and workspace are derived from authenticated server context.
- Role and workspace denial paths return structured 403 errors.
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
- SQLite migrations, WAL mode, stale-write rejection and backups are validated for the target deployment;
- workspace data is isolated at the domain-storage level before multi-tenant paid production;
- real payment, outreach and provider integrations have CLI smoke tests;
- production build passes;
- security smoke passes with `AURA_API_TOKEN`;
- business smoke confirms that the main journey communicates value, trust and clear next steps;
- limitations around tokenization, simulation and financial claims are visible.

## 19. Fan Platform OAuth

### Purpose

Allow fans to connect their social accounts (Instagram, TikTok, YouTube, Twitch, Discord) so Aura can detect their actions and award points automatically.

### Data Model

`sf_fan_platform_accounts` stores one row per (fan_id, platform):

| Column | Description |
| --- | --- |
| `fan_id` | References `sf_fans.id` |
| `platform` | One of: `instagram`, `tiktok`, `youtube`, `twitch`, `discord` |
| `access_token` | Encrypted OAuth access token |
| `refresh_token` | Optional refresh token |
| `token_expires_at` | ISO timestamp of token expiry |
| `connected_status` | `connected` or `disconnected` |
| `metadata` | JSON blob for platform-specific IDs (e.g. `instagram_user_id`, `discord_user_id`) |
| `last_scanned_at` | ISO timestamp of last signal scan |

### API Routes

| Route | Method | Description |
| --- | --- | --- |
| `/api/fan-auth/[platform]/start` | GET | Redirect fan to platform OAuth |
| `/api/auth/platforms/[platform]/callback` | GET | Exchange code, store tokens |
| `/api/fan/[fanId]/platforms` | GET | List connected platforms |
| `/api/platforms/[creatorId]` | GET | List creator platform accounts |

### Acceptance Criteria

- Fan can initiate OAuth for each supported platform.
- OAuth callback stores access_token, refresh_token, token_expires_at and metadata.
- `connected_status` is `connected` after successful OAuth.
- Connected platforms appear in the fan's platform list.
- Expired tokens are detected before scan and `error: "token_expired"` is returned in the scan result.
- No token → `error: "no_token"` in scan result (not 500).

## 20. Signal Detection

### Purpose

Automatically detect fan actions on each connected platform and award points based on configurable rules.

### Architecture

```
Platform scanner (pull, per fan, per platform)
  → RawSignal[]
  → matcher (platform + signalType + keyword + quota check)
  → processor (INSERT OR IGNORE dedup + awardPoints + challenge auto-complete)
  → PlatformSignal persisted with rewarded=1
```

Webhook handlers (push, platform-initiated):
- `POST /api/signals/webhook/instagram` — Meta mentions/comments
- `POST /api/signals/webhook/discord` — Discord bot, HMAC-signed

### Signal Rules

Each community has a set of `sf_signal_rules`:

| Field | Description |
| --- | --- |
| `platform` | Target platform |
| `signalType` | `post`, `story`, `video`, `comment`, `clip`, `raid`, `message` |
| `keywords` | Array of strings; empty = match all |
| `pointsReward` | Points awarded per match |
| `maxPerFan` | Max total matches per fan (optional) |
| `maxPerDay` | Max matches per fan per day (optional) |

### API Routes

| Route | Method | Description |
| --- | --- | --- |
| `/api/admin/signals/rules/[communityId]` | GET, POST | List / create rules |
| `/api/admin/signals/rules/rule/[ruleId]` | PATCH, DELETE | Update / delete rule |
| `/api/admin/signals/[communityId]` | GET | List detected signals + stats |
| `/api/admin/signals/scan/[communityId]` | POST | Trigger scan (community or single fan) |
| `/api/signals/webhook/instagram` | GET, POST | Meta webhook verification and mention events |
| `/api/signals/webhook/discord` | POST | Discord bot webhook (HMAC-signed) |

### Acceptance Criteria

- Signal rule can be created, listed, updated and deleted for a community.
- Scan endpoint returns `{ mode: "single_fan", result: { signalsDetected: 0, error: "no_token" } }` when no OAuth token is configured.
- Duplicate signals (same fan + platform + content_id) are silently ignored (INSERT OR IGNORE).
- Points are awarded only once per unique signal.
- Instagram webhook GET returns 200 with challenge when `hub.mode=subscribe` and correct verify token.
- Discord webhook returns 403 when HMAC signature is invalid.
- Community scan iterates fans with connected platforms and active rules.

### CLI Coverage

- `npm run smoke:superfan` — covers signal rule CRUD and scan endpoint (20 assertions, PASS).
- Gap: full end-to-end signal reward test requires real OAuth tokens and platform API access.
