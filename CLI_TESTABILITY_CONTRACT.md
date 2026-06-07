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
SMOKE_BASE_URL=http://localhost:3000
```

Some existing scripts default to `http://localhost:3170`; set `SMOKE_BASE_URL` explicitly when the app runs on another port.

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
| `npm run smoke:business` | Client mystere checks for clarity, value, trust and payment likelihood. |
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

## Current Testability Verdict

PARTIAL.

The repository now has backend-first scripts, resettable negative HTTP fixtures, SQLite migration/concurrency proof, role/workspace authorization smoke, signed Stripe webhook smoke, outreach approval/dry-run smoke and Chromium browser checks. Remaining gaps are external validation and production architecture: user-authorized Meta data, Google Places credentials, real Stripe Checkout completion, real email delivery, backup/restore proof and domain-level multi-workspace data isolation.
