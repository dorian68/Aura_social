# Aura CLI Testability Contract

## Purpose

Aura must be testable from the CLI before it is judged through the UI. The backend is the source of truth for feature behavior, state mutation, provider diagnostics and production readiness.

## General Rules

- Every critical feature must have a CLI command, debug script or smoke test.
- A smoke script must assert outcomes, not just print logs.
- External side effects must be disabled by default and reported in output metadata.
- Scripts must redact secrets and never print full tokens, API keys, private keys or wallet seeds.
- Scripts must exit non-zero on failed assertions.
- Scripts must return enough structured output to identify the failing step.

## Required Local Preconditions

- Dependencies installed with `npm install`.
- Next.js server running for HTTP smoke tests:

```bash
npm run dev
```

- Default app URL:

```bash
SMOKE_BASE_URL=http://localhost:3009
```

Aura runs on port **3009** by default (`PORT=3009 npm run dev`). Port 3000 and 3170 are occupied by unrelated local apps. Always set `SMOKE_BASE_URL` when the app is on another port.

## Existing Commands

| Command | Purpose | Current status |
| --- | --- | --- |
| `npm run smoke:platform` | End-to-end mock-safe platform smoke through health, UI routes, workspace, Meta mock, Instagram mock, B2B, agent and blockchain status. | Exists |
| `npm run smoke:security` | Verifies sensitive routes are gated when `AURA_API_TOKEN` is configured. | Exists |
| `npm run smoke:authz` | Verifies role minimums, identity propagation and workspace scope. | Exists |
| `npm run smoke:negative` | Verifies invalid JSON, unknown IDs and insufficient-balance errors against resettable fixtures. | Exists |
| `npm run smoke:persistence` | Verifies SQLite migrations, WAL mode, persistence and stale-write rejection. | Exists |
| `npm run smoke:integrations` | Verifies outreach approval/dry-run, Stripe signatures, amount/currency matching and webhook idempotence. | Exists |
| `npm run smoke:browser` | Verifies the dashboard in Chromium and visible simulation labels. | Exists |
| `npm run docker:smoke` | Verifies containerized app health and key mock-safe routes. | Exists |
| `npm run debug:workspace` | Checks workspace, connected-account metadata, integration readiness and audit trail. | Exists |
| `npm run debug:meta-flow` | Diagnoses Meta/Instagram auth and data flow backend-first. | Exists |
| `npm run debug:loyalty` | Exercises loyalty state and point logic. | Exists |
| `npm run debug:token-economy` | Exercises token economy simulation. | Exists |
| `npm run debug:agent` | Exercises deterministic agent recommendations and drafts. | Exists |
| `npm run debug:b2b-agent` | Exercises local partner discovery, scoring, pitch and simulated payment. | Exists |
| `npm run debug:google-places` | Calls Google Places when credentials and the real-discovery gate are present; otherwise reports an explicit skip. | Exists |
| `npm run db:migrate` | Applies and reports SQLite schema migrations. | Exists |
| `npm run debug:operator` | Exercises operator chat/tool orchestration. | Exists |
| `npm run debug:tools` | Exercises operator tool registry. | Exists |
| `npm run debug:contracts` | Checks contract/ABI infrastructure. | Exists |
| `npm run contracts:compile` | Compiles smart contracts. | Exists |
| `npm run contracts:test` | Runs Hardhat contract tests. | Exists |
| `npm run typecheck` | TypeScript validation. | Exists |
| `npm run lint` | ESLint validation. | Exists |
| `npm run build` | Production build validation. | Exists |

## Required Protocol Commands Added

| Command | Required coverage |
| --- | --- |
| `npm run smoke:journey` | Main customer journey from analysis to loyalty/reward/B2B monetization outcome. |
| `npm run smoke:superfan` | Full Superfan OS journey: creator → community → fan join → points → leaderboard → signal rules → admin dashboard (20 assertions). |
| `npm run smoke:signals` | Alias for smoke:superfan; covers signal rule CRUD, admin scan endpoint, and no-token graceful fallback. |
| `npm run smoke:auth` | Creator auth system: signup, session cookie, me endpoint, login, INVALID_CREDENTIALS, EMAIL_TAKEN, WEAK_PASSWORD, forgot-password (dev token), reset-password, TOKEN_USED guard, logout + session invalidation (12 assertions). |
| `npm run smoke:business` | Client mystere checks for clarity, value, trust and payment likelihood — now includes Superfan OS journey. |
| `npm run audit:commercial` | Structured commercial readiness audit and scoring. |
| `npm run production:check` | Environment, build, auth, mock-mode, persistence, provider and safety-gate readiness. |

These commands now exist in `package.json`. Their current verdict depends on the running environment and product maturity. In particular, `smoke:business` and `production:check` are expected to fail until paid-production blockers are resolved or explicitly accepted as demo-only scope.

## Feature-Level CLI Requirements

### Instagram Analyzer

Required assertions:

- Real mode never silently scrapes or falls back to fake data.
- Missing Graph API config returns structured configuration error.
- Mock mode reports mock status explicitly.
- Debug output identifies token, scope, account and discovery failures.

Command coverage:

- Existing: `npm run debug:meta-flow`
- Existing partial: `npm run smoke:platform`
- Gap: dedicated analyzer smoke for mock and missing-config paths.

### Loyalty and Rewards

Required assertions:

- Awarding points mutates fan balance and ledger.
- Redeeming points mutates balance and ledger.
- Insufficient points returns structured error.
- Reward eligibility explains missing points.
- State persists when `AURA_PERSISTENCE=local`.

Command coverage:

- Existing: `npm run debug:loyalty`
- Existing: `npm run smoke:journey` covers `/api/loyalty/award`, `/api/loyalty/redeem` and `/api/rewards/redeem` in the main monetization path.
- Existing: `npm run smoke:negative` covers invalid JSON, unknown IDs and insufficient points.
- Gap: deterministic reward stock exhaustion fixture.

### Fan Pass

Required assertions:

- Simulation returns expected holders, revenue and supply remaining.
- No live mint occurs unless on-chain writes are explicitly enabled.
- Contract ABI status is available.

Command coverage:

- Existing partial: `npm run smoke:journey` covers `/api/fan-pass/simulate`.
- Existing partial: `npm run debug:token-economy`
- Existing partial: `npm run debug:contracts`
- Gap: dedicated fan-pass command and live mint/write smoke once on-chain writes are explicitly enabled.

### B2B Expansion Agent

Required assertions:

- Run creates mock businesses, score, opportunity, pitch, campaign and payment simulation.
- `externalCalls` remains `0` while in MVP mode.
- Payment split matches commission and fan reward budget rules.
- Platform revenue equals the derived sum of persisted campaign commissions.
- Outreach status remains draft or mock-approved, never sent.

Command coverage:

- Existing: `npm run debug:b2b-agent`
- Existing partial: `npm run smoke:platform`
- Existing: `npm run smoke:journey`
- Existing: `npm run smoke:business`
- Existing: `npm run audit:commercial`
- Existing partial: `npm run smoke:integrations` covers signed Stripe webhook state and outreach approval/dry-run.
- Existing conditional: `npm run debug:google-places` covers the real provider when user credentials are available.
- Gap: live provider validation with user Google Places, Stripe Checkout and email-provider credentials.

### Agent Recommendations and Operator

Required assertions:

- Recommendations are deterministic in rules mode.
- Approve/reject/mock execute transitions are persisted.
- Mock execute performs no external side effect.
- Operator tool output is structured and safe.

Command coverage:

- Existing: `npm run debug:agent`
- Existing: `npm run debug:operator`
- Existing: `npm run debug:tools`
- Existing partial: `npm run smoke:platform`

### Workspace and Security

Required assertions:

- Health endpoint is public and secret-free.
- Sensitive routes return 401 without token when auth gate is active.
- Wrong token is rejected.
- Valid token permits protected route.
- Audit event is persisted and sanitized.

Command coverage:

- Existing: `npm run smoke:security`
- Existing: `npm run smoke:authz`
- Existing: `npm run debug:workspace`
- Existing partial: `npm run smoke:platform`

## Business CLI Smoke Contract

`npm run smoke:business` should produce a JSON or Markdown report containing:

- product promise detected;
- target user;
- main journey tested;
- first 30-second clarity score;
- business value score;
- trust score;
- UX simplicity score;
- commercial readiness score;
- would-pay verdict;
- top blockers.

It should fail when:

- mock data is not labeled;
- main CTA has no observable backend result;
- no concrete monetization result is produced;
- a paid-user promise depends on disabled integration;
- trust or commercial readiness score is below the agreed threshold.

## Production CLI Check Contract

`npm run production:check` should assert:

- `NODE_ENV=production` behavior is fail-closed for sensitive routes without auth token.
- `AURA_API_TOKEN` is configured and strong enough.
- `DEMO_MODE` is not true.
- mock modes are intentional and reported.
- required provider env vars are present for enabled real integrations.
- safety gates for payments, outreach and on-chain writes are explicit.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run smoke:security` pass in the target profile.

### Superfan OS

Required assertions:

- Creator can be created via API.
- Community can be created and attached to a creator.
- Fan joins and receives welcome points.
- Fan balance is correct after join.
- Fan appears on leaderboard.
- Admin dashboard reflects fan count and points.
- Signal rule can be created, listed.
- Scan endpoint returns graceful no-token error (not 500) when no OAuth token is configured.
- Analytics and report endpoints are reachable for a community.
- Challenge can be created by admin with auto-verification method.
- Reward can be created by admin.
- Fan can submit a challenge and receive auto-approval + points.
- Duplicate challenge submit returns `alreadySubmitted: true`.
- Admin completions list shows pending completions.
- Fan reward redemption deducts correct point balance.
- Creator onboarding API flow (creator → community → challenge) completes successfully.

Command coverage:

- **Updated**: `npm run smoke:superfan` — **30 assertions** covering the full Superfan OS journey including challenge submission, reward redemption, admin completions, creator onboarding steps. **Status: PASS (30/30)**
- **Updated**: `npm run smoke:business` — includes creator onboarding + challenge submission evidence; `onboardingComplete`, `challengeSubmitOk`, `challengeAutoApproved` signals; wouldPay evaluates Superfan OS product (not B2B infra).

### Creator Self-Service Onboarding

Required assertions:

- `POST /api/creators` creates a creator and returns `{ creator: { id, displayName } }`.
- `POST /api/admin/communities` creates a community with correct slug and returns `{ community: { id, slug } }`.
- `POST /api/admin/challenges/[communityId]` creates a challenge with `verificationMethod: "auto"`.
- `POST /api/admin/rewards/[communityId]` creates a reward.
- The public club page for the new slug returns `{ success: true }`.
- `/onboarding` page renders and the 3-step form is functional.

Command coverage:

- **Included in**: `npm run smoke:superfan` (assertions 26–30).
- **Included in**: `npm run smoke:business` (`collectSuperfanEvidence` tests the full onboarding API chain).

### Fan Challenge Submission

Required assertions:

- `POST /api/club/[slug]/submit` with `{ email, challengeId }` returns `{ submitted: true, autoApproved: true }` for `verificationMethod: "auto"`.
- Duplicate submit returns `{ alreadySubmitted: true }`.
- Submit for non-member returns `FAN_NOT_FOUND` error.
- Auto-approved submission awards points immediately (balance increases by `pointsReward`).
- Manual submit creates a pending completion visible in `GET /api/admin/completions/[communityId]`.

Command coverage:

- **Included in**: `npm run smoke:superfan` (assertions 28–30).
- **Included in**: `npm run smoke:business` (`challengeSubmitOk`, `challengeAutoApproved` fields).

### Signal Detection

Required assertions:

- Signal rule can be created for a community (platform, signalType, keywords, pointsReward).
- Signal rules list endpoint returns the created rule.
- Scan endpoint returns `{ mode: "single_fan", result: { signalsDetected: 0, error: "no_token" } }` when no OAuth token is available.
- Detected signals list returns `{ stats: { total: 0 } }` for a fresh community.
- Instagram webhook GET returns 200 when `hub.mode=subscribe` and correct verify token.
- Discord webhook POST returns 401 when HMAC signature is wrong.

Command coverage:

- **New**: `npm run smoke:signals` (alias for smoke:superfan) — covers rules CRUD and scan endpoint.
- Gap: end-to-end signal detection test requires real OAuth tokens and platform API access (external validation).

### Creator Auth System

Required assertions:

- `POST /api/auth/signup` with `{ displayName, email, password }` creates a creator, returns session cookie and creator profile.
- `GET /api/auth/me` with valid session cookie returns `{ creator: { id, displayName, email }, communities: [...] }`.
- `GET /api/auth/me` without cookie returns 401 `NOT_AUTHENTICATED`.
- `POST /api/auth/login` with correct credentials returns session cookie.
- `POST /api/auth/login` with wrong password returns `INVALID_CREDENTIALS` (not 500).
- `POST /api/auth/login` with unknown email returns `INVALID_CREDENTIALS` (timing-safe, no enumeration).
- `POST /api/auth/signup` with already-registered email returns `EMAIL_TAKEN`.
- `POST /api/auth/signup` with password < 8 chars returns `WEAK_PASSWORD`.
- `POST /api/auth/forgot-password` returns `{ devResetToken }` in dev mode for CLI testability.
- `POST /api/auth/reset-password` with valid token updates password and invalidates all existing sessions.
- `POST /api/auth/reset-password` with already-used token returns `TOKEN_USED`.
- `POST /api/auth/logout` clears session; subsequent `GET /api/auth/me` returns 401.

Command coverage:

- **New**: `npm run smoke:auth` — **12 assertions** covering full creator auth lifecycle. **Status: PASS (12/12)**
- **Dev mode**: `POST /api/auth/forgot-password` returns `resetToken` in response body when `NODE_ENV !== "production"` — no email provider required for CLI testing. In production, token is logged server-side (Resend integration pending).

Notes:

- Passwords hashed with bcrypt (12 rounds). Unknown-email login still calls `verifyPassword` with a dummy hash to prevent timing attacks.
- Sessions stored in `sf_sessions` table (SQLite, migration v7). Cookie: httpOnly, SameSite=Lax, 30-day expiry.
- Password reset tokens stored in `sf_password_resets` (migration v8): single-use, 1-hour expiry. Reset invalidates all existing sessions (forces re-login).
- `/dashboard/[communityId]` is server-protected: unauthenticated requests redirect to `/auth?next=...`.

## Current Testability Verdict

PASS for core Superfan OS journey (30/30 assertions).

PASS for creator auth system (12/12 assertions).

PARTIAL for production readiness.

The repository now has backend-first scripts, resettable negative HTTP fixtures, SQLite migration/concurrency proof, role/workspace authorization smoke, signed Stripe webhook smoke, outreach approval/dry-run smoke, Chromium browser checks, a 30-assertion Superfan OS smoke covering the full P0 product journey (creator self-service onboarding, challenge creation, fan challenge submission with auto-approval, duplicate guard, admin completions, reward redemption), and a 12-assertion creator auth smoke covering email/password signup, login, session lifecycle, forgot-password dev token, password reset and logout. Business smoke evaluates the creator Superfan OS product with `wouldPay` True when the end-to-end journey passes. Remaining gaps are external validation: user-authorized Meta data, Google Places credentials, real Stripe Checkout completion, real email delivery (Resend integration for password reset), backup/restore proof and domain-level multi-workspace data isolation.
