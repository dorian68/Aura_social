# Aura — Product Development Context
## Agentic Loyalty + Tokenized Community Infrastructure

## 1. Product Essence

Aura is a creator monetization platform.

The product helps creators, artists, musicians, influencers, creator managers, local brands and SMEs transform passive audiences into owned, monetizable communities.

The Instagram Analyzer is already built and must be treated as the acquisition hook. Do not rebuild it.

The next development phase is the actual application layer:

```text
Instagram Analyzer
→ Community diagnosis
→ Loyalty points economy
→ Tokenized fan pass / rewards infrastructure
→ Creator dashboard
→ Agentic activation layer
→ DM / campaign / reward automation
→ Revenue and retention loop
```

Aura should not be positioned as a speculative crypto product.

Aura should be positioned as:

> A loyalty and monetization engine for creators, powered by data, tokenized rewards and AI agents.

The creator should feel they are configuring a loyalty program, fan pass, reward system, VIP club and automated agent.

The blockchain/token layer should be infrastructure, not the headline.

---

## 2. Strategic Shift

NFTs, social tokens and creator coins were trendy in 2021.

Today, the market is more receptive to:

- AI agents
- automation
- CRM
- loyalty infrastructure
- first-party data
- creator monetization
- retention
- personalized commerce
- private communities
- gamified engagement
- programmable rewards

Therefore, Aura should combine:

```text
2021 Web3 loyalty primitives
+ 2026 Agentic AI workflows
= Agentic Loyalty Infrastructure for creators and SMEs
```

The core idea:

> P00LS-style community tokens failed because they were too speculative and too complex for mainstream users. Aura keeps the useful part — loyalty, status, access, rewards, community currency — and hides blockchain complexity behind a familiar points system and AI-powered automation.

---

## 3. Product Thesis

Creators and SMEs do not need “a token.”

They need:

- to identify their highest-value fans/customers
- to reward engagement
- to activate community behavior
- to convert engagement into revenue
- to automate follow-ups
- to launch VIP access, drops, rewards and campaigns
- to own more first-party data
- to reduce dependence on Instagram/TikTok algorithms

Aura solves this with:

1. **Analytics** — The Instagram Analyzer reveals audience potential.
2. **Loyalty Points** — Fans earn points for meaningful actions.
3. **Tokenization** — Points, badges, fan passes and rewards can be represented on-chain or simulated off-chain first.
4. **Agentic Automation** — AI agents recommend, trigger and eventually execute campaigns.
5. **Monetization** — Creators sell passes, VIP tiers, drops, events, access and memberships.

---

## 4. User Types

### Creator

The person or brand running a community.

Examples:

- Instagram creator
- musician
- DJ
- comedian
- coach
- artist
- fashion creator
- local brand
- restaurant
- event organizer
- Caribbean SME
- creator manager
- label

Needs:

- understand community value
- configure a loyalty program
- launch fan passes
- reward superfans
- automate campaign suggestions
- generate sales from community

### Fan / Customer

The person interacting with the creator or brand.

Needs:

- simple experience
- no crypto complexity
- earn points
- unlock rewards
- feel recognized
- receive personalized offers
- access VIP experiences

The fan should not need to create a wallet manually in the MVP. A wallet can be abstracted or simulated.

### Agent

The AI automation layer.

The agent should:

- monitor audience / loyalty signals
- generate recommendations
- propose campaigns
- suggest rewards
- identify high-value fans
- draft DMs
- simulate actions
- later execute actions after approval

In the MVP, the agent can be rule-based + LLM-assisted. Start with:

```text
Agent recommends
→ Creator approves
→ System simulates or executes safe action
```

---

## 5. Core Product Objects

The app should introduce the following domain concepts.

### CreatorProfile

Represents the creator using Aura.

Fields may include:

- id
- name
- handle
- avatar
- niche/category
- country/region
- connectedInstagramAccount
- connectedWallet
- loyaltyProgramId
- createdAt

### LoyaltyProgram

The creator’s configurable loyalty system.

Fields may include:

- id
- creatorId
- name
- description
- pointsName
- pointsSymbol
- status: draft | active | paused
- tokenizationMode: offchain | onchain_simulated | onchain_live
- createdAt
- updatedAt

Example:

```text
Program Name: Luna Inner Circle
Points Name: Luna Points
Symbol: LUNA
```

### LoyaltyRule

Defines how fans earn points.

Examples:

- like post = 1 point
- comment = 5 points
- save = 10 points
- share = 15 points
- purchase = 100 points per € spent
- attend event = 250 points
- refer friend = 500 points

Fields:

- id
- programId
- actionType
- points
- active
- description
- source: instagram | manual | purchase | event | referral | custom

### FanProfile

Represents a fan/customer.

Fields:

- id
- programId
- displayName
- instagramHandle
- email
- phone
- walletAddress
- pointsBalance
- tier
- tags
- lastInteractionAt
- createdAt

For the MVP, fan profiles can be mock/simulated.

### LoyaltyTransaction

Ledger of point events.

Fields:

- id
- programId
- fanId
- actionType
- pointsDelta
- source
- referenceId
- metadata
- createdAt

Example:

```text
Fan @marie commented on Reel #123 → +5 points
```

### Reward

A benefit fans can unlock.

Examples:

- 10% discount
- early merch access
- VIP concert pass
- private Discord
- backstage access
- exclusive video
- meet & greet
- priority reservation
- digital badge

Fields:

- id
- programId
- name
- description
- costInPoints
- rewardType
- availability
- stock
- status
- image
- unlockCondition

### FanPass

A membership/access pass.

Can be simulated first, then tokenized.

Fields:

- id
- programId
- name
- tier
- price
- supply
- benefits
- tokenContractAddress
- tokenId
- status
- image
- createdAt

Examples:

- Bronze Pass
- VIP Pass
- Inner Circle Pass
- Backstage Pass

### TokenEconomy

Represents the economic design of the loyalty system.

Fields:

- programId
- totalSupply
- creatorReserve
- communityRewardsPool
- launchAirdropPool
- partnerPool
- isTransferable
- isSpeculative
- pointsToTokenRatio
- tokenType

Important:
Default should be non-speculative.

Recommended default:

```text
Non-transferable loyalty points or badges first.
Transferable token optional later.
```

### AgentRecommendation

Represents an AI recommendation.

Fields:

- id
- programId
- type
- priority
- title
- message
- rationale
- suggestedAction
- expectedImpact
- status: pending | approved | rejected | executed
- createdAt

Example:

```text
Title: Push VIP reward to top engagers
Message: Your top 10 fans are 80 points away from unlocking VIP access.
Suggested action: Send a DM challenge to earn the missing points.
```

### Campaign

A campaign launched by the creator or agent.

Fields:

- id
- programId
- name
- objective
- channel
- targetSegment
- rewardId
- message
- status
- startsAt
- endsAt
- performance

Examples:

- Double Points Weekend
- VIP Pass Launch
- Early Merch Drop
- Top Fan Challenge

---

## 6. Tokenization Philosophy

Aura should not start with a tradable crypto token.

Start with:

1. Off-chain points ledger
2. Fan pass simulation
3. Reward unlock logic
4. Smart contract architecture
5. Testnet deployment
6. On-chain tokenization as an optional advanced mode

The user-facing vocabulary should be:

- Points
- Rewards
- Fan Pass
- VIP Badge
- Community Currency
- Loyalty Token
- Access Pass
- Superfan Tier
- Inner Circle

Avoid:

- pump
- moon
- speculation
- trading
- investment
- APY
- yield

---

## 7. Smart Contract Direction

The blockchain layer should support:

1. Loyalty points
2. Fan passes
3. Reward claims
4. Optional badges
5. Optional partner interoperability

Recommended architecture:

### Contract 1 — LoyaltyPoints

A token-like representation of points.

Possible standards:

- ERC20 for fungible points
- ERC1155 for flexible multi-token points/rewards
- non-transferable ERC20-like contract for loyalty points
- soulbound style for non-transferable badges

For MVP, prefer simplicity:

- Points are tracked off-chain in app database/mock state.
- Smart contract implementation can be created for local/testnet proof of concept.
- Smart contract should support minting points to fans, burning/redeeming points, and querying balances.

Important:
Do not make it speculative by default. Disable public transfer by default or make it configurable.

### Contract 2 — FanPass

Represents membership/access tiers.

Possible standard:

- ERC721 for unique passes
- ERC1155 for tiered passes

For MVP, ERC1155 is practical:

- Bronze Pass
- Silver Pass
- Gold Pass
- VIP Pass
- Event Pass

Functions:

- mintPass
- burnPass
- setURI
- setTierConfig
- checkAccess
- owner/admin controls

### Contract 3 — RewardVault / RewardRedeemer

Handles reward redemption.

Functions:

- createReward
- claimReward
- markRewardUsed
- checkEligibility
- emit events

Can be implemented in app first, then smart contract later.

---

## 8. Agentic AI Layer

The agentic layer should be built on top of the loyalty/token economy.

Agent should not be a random chatbot. It should be a business automation layer.

### Insight Agent

Reads analytics and loyalty data.

Outputs:

- high-value fan segments
- weak engagement signals
- reward suggestions
- revenue opportunities

### Campaign Agent

Suggests campaigns.

Examples:

- “Launch a double points challenge this weekend.”
- “Push VIP pass to top 25 fans.”
- “Offer early access to users with 500+ points.”
- “Send abandoned reward reminder.”

### DM Agent

Drafts messages.

Examples:

- Instagram DM
- WhatsApp message
- email
- announcement post
- story sequence

Important:
MVP should generate drafts only. Execution should require creator approval.

### Rewards Agent

Suggests rewards based on:

- creator category
- fan behavior
- available offers
- reward cost
- conversion potential

### Monetization Agent

Calculates:

- expected revenue
- fan pass pricing
- conversion scenarios
- ROI of campaigns
- projected revenue from point redemptions / pass sales

---

## 9. MVP Development Priority

The Instagram Analyzer is already finished.

Do not rebuild it.

Next development priority:

```text
Phase A — Loyalty Application Core
Phase B — Token Economy Simulation
Phase C — Smart Contract Proof of Concept
Phase D — Agentic Layer
Phase E — UI integration
```

---

## 10. Phase A — Loyalty Application Core

Build the app backend/domain layer for:

- creating loyalty programs
- configuring point rules
- simulating fans
- assigning points
- showing balances
- creating rewards
- redeeming rewards
- displaying a creator dashboard

No blockchain required yet.

The goal is to make the product usable without requiring crypto.

---

## 11. Phase B — Token Economy Simulation

Add:

- token economy config
- fan pass tiers
- point pools
- airdrop simulation
- community rewards pool
- projected cost / value / revenue scenarios
- non-speculative explanation

The creator should be able to simulate:

```text
If I allocate 10,000 points:
- 50% to top engagers
- 20% to early buyers
- 20% to challenge rewards
- 10% to partner rewards
```

---

## 12. Phase C — Smart Contract Proof of Concept

Create smart contracts in a dedicated folder.

Suggested stack:

- Hardhat
- Solidity
- OpenZeppelin
- TypeScript tests

Contracts:

- AuraLoyaltyPoints.sol
- AuraFanPass.sol
- AuraRewardRegistry.sol

Deploy only to local Hardhat network and optionally testnet if configured.

Include:

- tests
- deployment scripts
- ABI export
- README
- security notes
- non-transferable default behavior

Do not require mainnet.

---

## 13. Phase D — Agentic Layer

Implement agentic logic after the loyalty/token economy exists.

Start with deterministic rules and structured recommendations.

Then optionally connect to an LLM.

Agent outputs should be stored as AgentRecommendation objects.

Initial agent capabilities:

- analyze loyalty data
- suggest campaigns
- draft DM messages
- recommend rewards
- recommend point multipliers
- recommend fan pass pricing
- identify top fan segments
- generate launch script

The agent must explain why it recommends each action.

---

## 14. Phase E — UI Integration

Add application screens:

1. Loyalty Program Dashboard
2. Program Builder
3. Points Rules Builder
4. Fan Pass Builder
5. Rewards Catalog
6. Fan Ledger / CRM
7. Token Economy Simulator
8. Smart Contract / Testnet Status
9. Agent Recommendations Center
10. Campaign Launcher

Use the existing visual direction:

- dark premium UI
- lime accents
- mathematical/data visualization style
- not fantasy
- not crypto-bro
- not cartoonish
- more quant/data intelligence for creators

---

## 15. Development Philosophy

Use backend-first debugging.

For every integration:

```text
Backend CLI/debug script first
→ structured logs
→ exact failure point
→ backend validated
→ then UI
```

Create scripts such as:

```bash
npm run debug:loyalty
npm run debug:token-economy
npm run debug:contracts
npm run debug:agent
```

Do not debug only through the UI.

Do not ask for permission before every safe command.

Ask only when human authentication, external dashboard configuration, or destructive action is required.

Never log secrets in full.

---

## 16. Success Criteria

The next product iteration is successful if:

- The existing Instagram Analyzer remains intact.
- A creator can create/configure a loyalty program.
- The app can simulate fans and point balances.
- The creator can create rewards and fan passes.
- The app can simulate token economy allocation.
- Smart contracts exist with tests.
- The agent can generate actionable recommendations.
- The UI shows the loyalty/token/agentic logic clearly.
- The product feels like a serious monetization engine, not a crypto toy.

---

## 17. Final Product Framing

Aura should feel like:

```text
NotJustAnalytics
+ loyalty program builder
+ creator CRM
+ tokenized reward infrastructure
+ agentic marketing automation
+ quantitative revenue modeling
```

Core promise:

> Model your audience. Activate your superfans. Automate your community revenue.
