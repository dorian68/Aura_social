# Codex Prompt — Build Aura Application Layer
## Agentic Loyalty + Token Economy + Smart Contracts

Act as a senior full-stack engineer, blockchain architect, Solidity developer, product engineer, and agentic AI systems designer.

You are working on an existing MVP called Aura.

Aura is a creator monetization platform. The Instagram Analyzer is already completed. Do not rebuild it, do not break it, and do not waste time reimplementing existing analyzer logic.

The new mission is to build the real application layer of Aura:

1. Loyalty points economy
2. Tokenized fan pass / reward infrastructure
3. Smart contract proof of concept
4. Creator-facing loyalty dashboard
5. Agentic AI layer on top of the loyalty/token system

This must turn Aura from an Instagram analytics hook into a real product for helping creators monetize, retain and activate their communities.

Use the project context in `aura_agentic_loyalty_context.md` as the source of truth.

---

## Important Product Direction

Do not build a speculative crypto trading product.

Do not create a 2021-style social token app where fans must buy and sell creator coins.

Instead, build a modern hybrid platform:

```text
Creator analytics
+ loyalty points
+ fan passes
+ reward unlocks
+ tokenized infrastructure
+ AI agents that recommend and automate monetization actions
```

The user-facing experience should feel simple:

- create a loyalty program
- define how fans earn points
- create fan passes
- create rewards
- simulate token economy
- get AI recommendations
- launch campaigns

The blockchain layer should be optional infrastructure.

Default philosophy:

- off-chain loyalty ledger first
- smart contract proof of concept second
- on-chain/testnet support later
- no mainnet deployment required
- no speculative trading
- no investment language

---

## Development Method

Follow the backend-first debugging paradigm.

Do not rely on UI-only debugging.

For every new backend module, create CLI/debug scripts and structured logs.

Ask me only when:

- human authentication is required
- credentials are missing
- a destructive operation is required
- an external dashboard must be configured manually

Do not ask for validation before every safe command. Execute the development workflow directly.

Never log secrets in full.

---

## Project Assumptions

Current app:

- Next.js / Tailwind app
- Existing Instagram Analyzer already works
- Existing dashboard has mock simulation data
- Existing code likely includes `app/api/analyze-instagram/route.ts`
- Existing analytics engine is in `lib/analytics`
- Existing mock data may be in `lib/mockData.ts`

Your job:

- inspect the current structure first
- preserve working analyzer code
- add the new application layer cleanly
- avoid giant files
- use typed domain models
- add test/debug scripts
- connect UI after backend/domain layer is working

---

## Target Architecture

Create or adapt the following structure if compatible with the existing project:

```text
/lib/loyalty
  types.ts
  loyaltyRules.ts
  loyaltyEngine.ts
  rewardEngine.ts
  fanPassEngine.ts
  tokenEconomyEngine.ts
  mockLoyaltyData.ts

/lib/agent
  types.ts
  recommendationEngine.ts
  campaignAgent.ts
  dmAgent.ts
  monetizationAgent.ts
  agentOrchestrator.ts

/lib/blockchain
  types.ts
  contractConfig.ts
  chainConfig.ts
  blockchainService.ts
  abi/
  README.md

/contracts
  AuraLoyaltyPoints.sol
  AuraFanPass.sol
  AuraRewardRegistry.sol

/test or /contracts/test
  AuraLoyaltyPoints.test.ts
  AuraFanPass.test.ts
  AuraRewardRegistry.test.ts

/scripts
  debug-loyalty.mjs
  debug-token-economy.mjs
  debug-agent.mjs
  debug-contracts.mjs
  deploy-local.mjs
  export-abis.mjs

/app/api/loyalty
/app/api/rewards
/app/api/fan-pass
/app/api/token-economy
/app/api/agent

/app/dashboard or existing dashboard
/app/loyalty or /app/program
```

If the project uses another clean convention, adapt intelligently, but keep separation of concerns.

---

## Phase 1 — Inspect Existing Project

First:

1. Inspect `package.json`.
2. Inspect app routes.
3. Inspect the Instagram Analyzer implementation.
4. Inspect existing dashboard and mockData.
5. Identify whether TypeScript is already configured.
6. Identify whether a database exists. If no DB exists, use typed in-memory/mock persistence first.
7. Identify whether Hardhat is installed. If not, add it only if appropriate.

Do not change the analyzer unless absolutely required.

---

## Phase 2 — Domain Model

Implement typed domain models for:

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

Create these in a central type file.

Required concepts:

```ts
type TokenizationMode = "offchain" | "onchain_simulated" | "onchain_live";
type LoyaltyProgramStatus = "draft" | "active" | "paused";
type AgentRecommendationStatus = "pending" | "approved" | "rejected" | "executed";
type RecommendationPriority = "low" | "medium" | "high" | "urgent";
```

Use strong TypeScript interfaces and keep fields explicit.

---

## Phase 3 — Loyalty Points Engine

Build a loyalty engine that can:

1. Create a loyalty program.
2. Configure point rules.
3. Award points to fans.
4. Deduct/redeem points.
5. Maintain a transaction ledger.
6. Calculate fan tier.
7. Calculate total points issued.
8. Calculate total points redeemed.
9. Calculate outstanding liability.
10. Segment fans by value.

Default point rules:

- like = 1 point
- comment = 5 points
- save = 10 points
- share = 15 points
- purchase = 100 points per monetary unit or configurable
- event_attendance = 250 points
- referral = 500 points
- manual_bonus = configurable

Tier logic:

- New Fan: 0–99 points
- Engaged Fan: 100–499 points
- Superfan: 500–1,999 points
- Inner Circle: 2,000+ points

Add helper functions:

- calculatePointsForAction
- awardPoints
- redeemPoints
- calculateTier
- getFanBalance
- getProgramLedger
- getTopFans
- calculateProgramStats
- segmentFans

---

## Phase 4 — Rewards Engine

Build a reward engine that can:

1. Create rewards.
2. Check if a fan can redeem a reward.
3. Redeem a reward.
4. Decrease stock if applicable.
5. Generate redemption transaction.
6. Return eligibility status.

Reward types:

- discount
- early_access
- exclusive_content
- event_access
- merch
- private_community
- badge
- custom

Eligibility output should be explicit:

```json
{
  "eligible": true,
  "reason": "Fan has enough points",
  "missingPoints": 0
}
```

or:

```json
{
  "eligible": false,
  "reason": "Insufficient points",
  "missingPoints": 120
}
```

---

## Phase 5 — Fan Pass Engine

Build a fan pass engine.

Fan passes are membership/access products.

Support:

- Bronze Pass
- Silver Pass
- Gold Pass
- VIP Pass
- Inner Circle Pass
- Event Pass

Functions:

- createFanPass
- calculatePassRevenue
- simulatePassLaunch
- assignPassToFan
- checkFanPassAccess

Pass launch simulation should calculate:

- expected conversion
- estimated revenue
- number of pass holders
- capacity/supply remaining
- recommendation on price/supply

Example:
If creator has 50,000 followers, 2.5% strong engagement and 0.5% expected pass conversion at €19, estimate launch revenue.

---

## Phase 6 — Token Economy Simulator

Build a non-speculative token economy simulator.

It should let the creator model:

- total points supply
- launch airdrop pool
- creator reserve
- community rewards pool
- partner rewards pool
- transferability
- points-to-token ratio
- fan pass allocation
- redemption pressure
- estimated liability

Default allocation:

- 50% community rewards pool
- 20% launch airdrop pool
- 15% creator reserve
- 10% partner pool
- 5% campaign buffer

Important:
Default should be `isTransferable = false` and `isSpeculative = false`.

The simulator must clearly state:

> This is a loyalty economy simulation, not an investment product.

Build functions:

- createDefaultTokenEconomy
- simulateAirdrop
- simulateRewardsPool
- calculateOutstandingLiability
- calculateRedemptionPressure
- calculateTokenReadinessFromLoyalty
- validateTokenEconomyConfig

---

## Phase 7 — Backend API Routes

Add backend routes for the new application layer.

Use Next.js route handlers if this is a Next.js app.

Suggested API endpoints:

```text
GET /api/loyalty/demo
POST /api/loyalty/program
GET /api/loyalty/program/:id
POST /api/loyalty/rules
POST /api/loyalty/award
POST /api/loyalty/redeem
GET /api/loyalty/fans
GET /api/loyalty/stats

POST /api/rewards
GET /api/rewards
POST /api/rewards/redeem

POST /api/fan-pass
GET /api/fan-pass
POST /api/fan-pass/simulate

POST /api/token-economy/simulate
GET /api/token-economy/demo

POST /api/agent/recommendations
GET /api/agent/recommendations
POST /api/agent/campaign-draft
POST /api/agent/dm-draft
```

If dynamic route structure is easier, implement accordingly.

All responses should be structured:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "...",
    "message": "...",
    "details": "..."
  }
}
```

---

## Phase 8 — Smart Contract Proof of Concept

Implement Solidity contracts using Hardhat and OpenZeppelin.

If Hardhat is not installed:

- add Hardhat
- add OpenZeppelin contracts
- add TypeScript support if consistent with project

Contracts:

1. AuraLoyaltyPoints.sol
2. AuraFanPass.sol
3. AuraRewardRegistry.sol

### Contract 1 — AuraLoyaltyPoints.sol

Goal:
Represent loyalty points on-chain for testnet/local demo.

Requirements:

- owner/admin can mint points
- owner/admin can burn/redeem points
- users can query balance
- transfers disabled by default
- optional admin function to enable transfers only if explicitly configured
- events:
  - PointsMinted
  - PointsRedeemed
  - TransferabilityChanged

Use OpenZeppelin where appropriate.

Do not make it a speculative free-transfer token by default.

### Contract 2 — AuraFanPass.sol

Goal:
Represent fan passes as ERC1155 tiers.

Requirements:

- mint pass by tier
- set tier supply
- set tier metadata URI
- check if address owns a given tier
- owner/admin controls
- events:
  - FanPassMinted
  - TierConfigured

Tiers:

- Bronze
- Silver
- Gold
- VIP
- InnerCircle

### Contract 3 — AuraRewardRegistry.sol

Goal:
Register and claim rewards.

Requirements:

- create rewards
- update rewards
- claim rewards if eligible
- emit RewardCreated, RewardClaimed
- can be simple for MVP
- optional integration with points contract can be simulated

Tests:
Write tests for:

- minting points
- redeeming points
- disabled transfers
- enabling transfers if allowed
- minting fan passes
- checking access
- creating and claiming rewards

Scripts:

- deploy-local.mjs
- export-abis.mjs
- debug-contracts.mjs

Add README in blockchain/contracts folder explaining:

- how to install
- how to test
- how to deploy locally
- how to export ABI
- why transfers are disabled by default
- how this maps to the app

---

## Phase 9 — Blockchain Service Layer

Build a frontend/backend service layer to prepare for contract integration.

Create:

- contractConfig.ts
- chainConfig.ts
- blockchainService.ts
- types.ts

Functions:

- getSupportedChains
- getContractAddresses
- formatWalletAddress
- isValidAddress
- mockMintPoints
- mockMintFanPass
- mockRedeemReward
- getContractStatus
- loadAbi

For now, if no wallet integration exists, expose mock/testnet status and keep UI honest:

```text
Smart contract mode: Local/testnet proof of concept
Live chain: Not connected
Mainnet: Disabled
```

---

## Phase 10 — Agentic Layer

After the loyalty engine, token economy simulator and smart contract proof of concept exist, implement the agentic layer.

Do not create a random chatbot.

Create structured business agents.

Agents:

1. InsightAgent
2. CampaignAgent
3. DMAgent
4. RewardsAgent
5. MonetizationAgent
6. AgentOrchestrator

The agent system should read:

- loyalty program stats
- fan segments
- reward catalog
- fan pass configuration
- token economy simulation
- existing Instagram Analyzer output if available

It should output AgentRecommendation objects.

Recommendation types:

- campaign
- reward
- pricing
- dm
- fan_segment
- token_economy
- risk
- opportunity

Priority:

- low
- medium
- high
- urgent

Each recommendation must include:

- title
- message
- rationale
- suggestedAction
- expectedImpact
- confidence
- status

Examples:

1. Title: “Launch a double-points challenge this weekend”
   Rationale: “Your top fans are active but 42% are less than 100 points away from the Superfan tier.”
   Suggested action: “Give +2x points for comments and shares for 48 hours.”
   Expected impact: “Estimated +18% engagement and 35 new Superfans.”

2. Title: “Push VIP Pass to top 25 fans”
   Rationale: “Your top 25 fans have high engagement and enough points to unlock a premium reward.”
   Suggested action: “Send a personalized DM offering early access to the VIP Pass.”
   Expected impact: “Estimated €475 launch revenue at €19/pass with 100% top-fan targeting.”

3. Title: “Reduce reward cost”
   Rationale: “Only 4% of fans can currently afford your VIP reward. Lowering cost from 1,000 to 750 points could increase redemption by 2.4x.”

MVP can be rule-based.

If there is already an LLM integration, add optional LLM enhancement behind env flag:

```text
AGENT_MODE=rules | llm
```

If no LLM key exists, default to deterministic rule-based recommendations.

---

## Phase 11 — Agentic Campaign / DM Drafts

Build draft generation functions:

- generateInstagramAnnouncement
- generateStorySequence
- generateTopFanDM
- generateRewardReminderDM
- generateVIPPassLaunchDM
- generateDoublePointsCampaign
- generatePartnerOfferMessage

Tone:

- warm
- direct
- creator-friendly
- not corporate
- adaptable to Caribbean/local creators but not forced
- no fake slang

Output:

```json
{
  "channel": "instagram_dm",
  "audience": "top_fans",
  "message": "...",
  "cta": "...",
  "approvalRequired": true
}
```

Important:
No autonomous sending yet.

The system should say “Approve & Execute” as a mock/safe action unless real Instagram messaging API is configured.

---

## Phase 12 — UI Development

After backend/domain logic is working and debug scripts pass, update the UI.

Add or update screens:

1. Creator Dashboard
2. Loyalty Hub
3. Points Rules Builder
4. Rewards Catalog
5. Fan Pass Builder
6. Token Economy Simulator
7. Smart Contract Status
8. Agent Recommendations Center
9. Campaign Draft Center
10. Fan CRM / Ledger

UI requirements:

- dark premium SaaS design
- lime accents
- mathematical/data visualization style
- no fantasy
- no crypto-bro
- no cartoonish mascots
- no speculative coin imagery
- no “moon/pump” language

Dashboard cards:

- Total Points Issued
- Active Fans
- Superfans
- Inner Circle Fans
- Fan Pass Revenue Potential
- Rewards Redeemed
- Token Readiness
- Agent Opportunities

Loyalty Hub:

- program overview
- point rules
- top fans
- ledger
- recent transactions

Rewards Catalog:

- reward cards
- cost in points
- stock
- eligibility
- redemption simulation

Fan Pass Builder:

- pass tiers
- price
- supply
- benefits
- revenue simulation

Token Economy Simulator:

- allocation chart
- transferability toggle
- non-speculative badge
- airdrop simulation
- pool allocation
- liability estimate

Agent Recommendations:

- recommendation cards
- priority
- rationale
- expected impact
- approve/reject/mock execute

Campaign Draft Center:

- generated DM
- story sequence
- launch post
- approval CTA

---

## Phase 13 — Debug Scripts

Create scripts:

```bash
npm run debug:loyalty
npm run debug:token-economy
npm run debug:agent
npm run debug:contracts
```

Each script should output clear structured diagnostics.

`debug:loyalty` should:

- create a demo program
- create demo fans
- award points
- redeem reward
- print stats
- validate tier changes

`debug:token-economy` should:

- create default token economy
- simulate airdrop
- calculate pools
- calculate liability
- validate config

`debug:agent` should:

- load demo loyalty data
- generate recommendations
- generate DM draft
- generate campaign draft
- print expected impact

`debug:contracts` should:

- compile contracts
- run tests or summarize contract test status

---

## Phase 14 — Documentation

Create or update:

- README section for loyalty engine
- README section for smart contracts
- README section for agentic layer
- `.env.example` if needed
- architecture notes

Explain:

- Instagram Analyzer is the hook
- Loyalty engine is the product core
- Tokenization is optional infrastructure
- Smart contracts are proof of concept
- Agents recommend actions, but execution requires approval
- No speculative token behavior by default

---

## Phase 15 — Safety / Compliance Language

Add product copy and code comments where needed:

- Loyalty points are not financial instruments.
- Fan passes are access/membership products.
- Token economy simulator is not investment advice.
- Transfers are disabled by default.
- Mainnet deployment is disabled by default.
- Campaign execution requires creator approval.

---

## Phase 16 — Acceptance Criteria

You are done when:

1. Existing Instagram Analyzer still works.
2. New loyalty domain models are implemented.
3. Loyalty points engine works with demo data.
4. Rewards engine works.
5. Fan pass engine works.
6. Token economy simulator works.
7. Smart contracts compile and have tests.
8. Debug scripts exist and run.
9. Agentic recommendation layer works with demo data.
10. UI shows the new application layer clearly.
11. Documentation explains how to use and extend the system.
12. No full secrets are logged.
13. No speculative crypto language is used.
14. Backend/domain logic is tested before UI integration.

---

## Expected Final Output

At the end, provide a concise development summary:

- files created
- files modified
- commands run
- tests/debug scripts run
- what works
- what remains mocked
- what is ready for real integration
- how to run the new functionality

Start by inspecting the project, then execute the implementation.
