# Aura MVP

Aura combines an Instagram Analyzer acquisition hook with a creator loyalty, rewards, fan pass and agentic monetization layer.

## Run

```bash
npm install
npm run dev
```

Local product smoke test, assuming the dev server is running:

```bash
npm run smoke:platform
```

This temporarily enables Meta mock mode, tests the official OAuth/private-insights surfaces in
simulation, then restores the previous mock setting.

Health endpoint:

```bash
curl http://localhost:3170/api/system/health
```

It reports the Meta setup state, local persistence state, loyalty/B2B object counts and blockchain
ABI availability without exposing secrets.

Workspace/control-plane diagnostic:

```bash
npm run debug:workspace
```

This checks the SaaS workspace, connected-account metadata registry, integration readiness and
audit trail. It does not call external APIs and does not print secrets.

## Local Persistence

The MVP persists loyalty and B2B agent state as local JSON by default:

```text
data/aura-state/loyalty-state.json
data/aura-state/b2b-agent-state.json
```

Set `AURA_PERSISTENCE=memory` to use ephemeral in-memory state. Meta access tokens remain session
memory only in this prototype and are not written to disk.

## Existing Instagram Analyzer

The analyzer remains available at `/` and still uses the existing `/api/analyze-instagram` route.
The root app now uses the official Instagram Graph API Business Discovery flow. Configure
`INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_IG_USER_ID` and `INSTAGRAM_GRAPH_VERSION` server-side. If those
values are missing, the API returns a clear configuration error instead of falling back to scraping.

## Meta OAuth / Private Insights

Open `/dashboard#meta-insights` to configure Meta Login for the local prototype without editing
`.env`. The app supports:

- Instagram Login direct with `instagram_business_basic` and `instagram_business_manage_insights`;
- Facebook Login for Business with a Configuration ID;
- server-side authorization-code exchange;
- in-memory connection tokens for the prototype session;
- private media insights dashboard;
- saving a connected account as the Business Discovery source for public estimates.

Backend-first diagnostic:

```bash
npm run debug:meta-flow
```

With a manually supplied debug token:

```bash
npm run debug:meta-flow -- --provider instagram --access-token <TOKEN> --ig-user-id me
```

Tokens are summarized in logs; full secrets are not printed.

## B2B Expansion Agent

The B2B Expansion Agent simulates a hyperlocal partner growth loop:

```text
creators -> fans -> loyalty points -> local businesses -> sponsored rewards -> platform revenue
```

Run the backend-first diagnostic:

```bash
npm run debug:b2b-agent
```

Open `/dashboard`, then use the “Agentic B2B Growth Engine” section.

Current mode is mock/simulation:

- no real businesses are contacted;
- no Google Places request is made;
- no scraping is performed;
- no Stripe payment is created;
- outreach drafts require approval and are not sent.

See `docs/b2b-expansion-agent.md` for the API routes and future integration notes.

## Agentic Layer

Run:

```bash
npm run debug:agent
```

The current agent layer is deterministic and rule-based. It creates recommendations, campaign
drafts and DM drafts. The dashboard supports approve, reject and mock execute states. Real sending
requires explicit integration and approval controls.

## Loyalty / Token Economy

Run:

```bash
npm run debug:loyalty
npm run debug:token-economy
```

The loyalty ledger is off-chain first and in-memory for the MVP. The token economy simulator is
non-speculative by default, with transfers disabled and mainnet disabled.

## Smart Contracts

Run:

```bash
npm run debug:contracts
npm run contracts:export-abis
```

The proof of concept includes:

- `AuraLoyaltyPoints`
- `AuraFanPass`
- `AuraRewardRegistry`

See `lib/blockchain/README.md`.

## Safety

Aura loyalty points are not financial instruments. Fan passes are access and membership products. Tokenization and B2B payment flows are local/testnet/mock infrastructure until real integrations are explicitly configured.
