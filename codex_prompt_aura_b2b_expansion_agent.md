Act as a senior full-stack engineer, AI agent architect, growth engineer, and product strategist.

You are working on an existing product called Aura.

Aura is a creator monetization platform with:
- an Instagram Analyzer already completed
- a loyalty points / tokenized fan pass direction
- an agentic loyalty and campaign automation layer being developed

Your new task is to integrate the **B2B Expansion Agent** into Aura.

Use `aura_b2b_expansion_agent_context.md` as the product context and source of truth.

This new layer should turn Aura into an **agentic hyperlocal partner network**.

The goal:
Aura should not only help creators monetize fans directly. It should also help local businesses sponsor rewards, promo codes and loyalty campaigns connected to creators’ communities.

This creates a platform growth loop:

```text
Creators bring fan communities
→ Fans earn loyalty points
→ B2B Expansion Agent finds local businesses
→ Businesses sponsor rewards/promos
→ Fans visit/buy locally
→ Aura earns commission
→ Creators get more rewards for fans
→ Network value increases
```

IMPORTANT

Do not build a generic scraping bot.

Do not send real emails or DMs automatically.

Do not implement unauthorized scraping.

Do not contact real businesses without explicit approval.

For MVP:
- simulate Google Places discovery
- create clean abstractions for future Google Places API integration
- generate mock SMEs
- generate realistic partnership opportunities
- generate B2B outreach drafts
- simulate payments and platform commission
- display the growth loop in the UI
- add backend-first debug scripts

DEVELOPMENT METHOD

Follow backend-first debugging.

Do not rely on UI-only development.

Implement the backend/domain layer, CLI debug script and structured logs first.

Only after the backend/domain layer works, integrate UI.

Ask me only when:
- credentials are missing
- human authentication is required
- destructive operation is required
- an external dashboard must be configured manually

Do not ask for approval before every safe command. Execute directly.

Never log secrets in full.

PHASE 1 — INSPECT PROJECT

First inspect:
1. package.json
2. existing app routes
3. current dashboard structure
4. existing loyalty/agent code if already implemented
5. existing mock data structure
6. existing API response conventions
7. styling conventions

Do not break the Instagram Analyzer.

Do not rebuild existing loyalty engine if it already exists.

Integrate this new B2B agent cleanly.

PHASE 2 — DOMAIN MODELS

Add typed models for the B2B Expansion Agent.

Create or extend files such as:

```text
/lib/b2b-agent/types.ts
/lib/b2b-agent/mockBusinesses.ts
/lib/b2b-agent/discoveryProvider.ts
/lib/b2b-agent/fitScoringEngine.ts
/lib/b2b-agent/opportunityEngine.ts
/lib/b2b-agent/pitchGenerator.ts
/lib/b2b-agent/paymentSimulator.ts
/lib/b2b-agent/agentRunLogger.ts
/lib/b2b-agent/b2bAgentOrchestrator.ts
```

Adapt names to the existing project structure if needed.

Models to implement:

### LocalBusiness

Fields:
- id
- name
- category
- address
- city
- region
- country
- latitude
- longitude
- website
- phone
- email
- instagramHandle
- googlePlaceId
- rating
- reviewCount
- priceLevel
- source
- discoveryStatus
- createdAt

### BusinessFitScore

Fields:
- businessId
- creatorId
- audienceLocationFit
- categoryFit
- offerFit
- budgetFit
- proximityScore
- culturalFit
- overallScore
- rationale

### PartnershipOpportunity

Fields:
- id
- creatorId
- businessId
- title
- objective
- proposedBudget
- platformCommissionRate
- platformCommission
- fanRewardBudget
- proposedOffer
- targetSegment
- estimatedReach
- estimatedRedemptions
- estimatedBusinessRevenue
- status
- createdAt

### SponsoredRewardCampaign

Fields:
- id
- partnershipOpportunityId
- creatorId
- businessId
- name
- budget
- fanRewardBudget
- platformCommission
- rewardType
- promoCode
- pointsBonus
- startDate
- endDate
- status
- performance

### OutreachDraft

Fields:
- id
- businessId
- creatorId
- channel
- subject
- message
- tone
- callToAction
- status
- approvalRequired
- createdAt

### AgentRun

Fields:
- id
- agentName
- location
- categories
- status
- logs
- businessesDiscovered
- opportunitiesGenerated
- revenuePotential
- createdAt
- completedAt

PHASE 3 — MOCK DISCOVERY PROVIDER

Implement a mock Google Places-style discovery provider.

Function:

```ts
discoverLocalBusinesses(input)
```

Input:
- city
- region
- country
- categories
- radiusKm
- limit

Output:
- LocalBusiness[]

Default cities:
- Fort-de-France
- Pointe-à-Pitre
- Basse-Terre
- Le Gosier
- Baie-Mahault
- Sainte-Anne
- Les Abymes

Default categories:
- restaurant
- bar
- fashion
- beauty
- gym
- hotel
- tourism
- event_venue
- concept_store
- local_brand
- rum_brand
- food_truck

Create realistic mock businesses, clearly marked as mock/simulated.

Examples:
- Le Sunset Beach Restaurant
- Kréol Concept Store
- Maison Tropik
- Studio Belle Peau
- Rhum Heritage Boutique
- Club Fit Caraïbes
- Bèl Vibes Café
- Kaz Event Lounge

Each business should have:
- category
- city
- address
- instagramHandle
- rating
- reviewCount
- approximate coordinates
- optional website/email/phone

Add a provider interface so real Google Places API can be added later:

```ts
interface BusinessDiscoveryProvider {
  discover(input: BusinessDiscoveryInput): Promise<LocalBusiness[]>
}
```

Implement:

```ts
MockGooglePlacesProvider
```

Optional placeholder:

```ts
GooglePlacesProvider
```

but do not call real Google Places unless env variables are configured.

PHASE 4 — FIT SCORING ENGINE

Implement a scoring engine that estimates whether a local business is a good partner for a creator/community.

Function:

```ts
scoreBusinessFit(business, creatorContext, loyaltyContext)
```

Inputs:
- business
- creator profile or mock creator
- loyalty stats
- active fan count
- top fan locations if available or mock
- creator category

Scores:
- audienceLocationFit: 0–100
- categoryFit: 0–100
- offerFit: 0–100
- budgetFit: 0–100
- proximityScore: 0–100
- culturalFit: 0–100
- overallScore: weighted average

Suggested weighting:
- audienceLocationFit: 25%
- categoryFit: 20%
- offerFit: 20%
- proximityScore: 15%
- budgetFit: 10%
- culturalFit: 10%

Return rationale explaining why.

Example:
“Restaurant category is highly compatible with pre-event fan activations and the business is located near the creator’s strongest audience cluster.”

PHASE 5 — PARTNERSHIP OPPORTUNITY ENGINE

Implement an engine that creates campaign opportunities.

Function:

```ts
createPartnershipOpportunity({
  creator,
  business,
  fitScore,
  loyaltyStats,
  campaignBudget
})
```

Default campaign budget:
€200

Default commission:
30%

Budget split:
- 70% fan reward budget
- 30% Aura platform commission

Calculate:
- platformCommission
- fanRewardBudget
- estimatedReach
- estimatedRedemptions
- estimatedBusinessRevenue
- proposedOffer
- targetSegment

Default assumptions:
- activeFans = from loyalty stats or mock
- locationFit = fitScore.audienceLocationFit / 100
- estimatedReach = activeFans * locationFit
- redemptionRate = based on fitScore, default between 3% and 12%
- averageOrderValue:
  - restaurant: €28
  - bar: €18
  - fashion: €45
  - beauty: €55
  - gym: €40
  - hotel/tourism: €90
  - event_venue: €35
  - local_brand: €30
- estimatedBusinessRevenue = estimatedRedemptions * averageOrderValue

Suggested offer examples:
- “15% discount before the concert”
- “Free drink with fan pass”
- “Early access to a limited drop”
- “Double loyalty points for purchases this weekend”
- “VIP queue access”
- “Fan-only bundle”

PHASE 6 — PITCH GENERATOR

Implement a pitch generator for B2B outreach.

Function:

```ts
generatePartnershipPitch({
  creator,
  business,
  opportunity,
  fitScore,
  tone
})
```

Channels:
- email
- instagram_dm
- whatsapp
- crm_note

Tone:
- professional
- warm
- Caribbean/local
- premium
- concise

The pitch should include:
- business name
- creator name
- why the match makes sense
- active fan/community signal
- campaign budget
- 70/30 split
- proposed offer
- expected reach/redemptions
- CTA
- note that Aura handles campaign setup/tracking

Example:

```text
Bonjour Le Sunset Beach Restaurant,

Aura’s agent detected a strong local opportunity between your restaurant and Luna Beats’ community.

Luna’s fans generated 50,000 loyalty points this month, and our model estimates that 4,000 active fans are reachable around Fort-de-France.

We propose a €200 sponsored loyalty campaign:
- €140 converted into fan rewards and promo incentives
- €60 Aura orchestration commission
- a custom promo code distributed to top fans
- automated campaign tracking inside Aura

Suggested activation:
“Show this code before Luna’s concert and get 15% off your dinner.”

Aura handles targeting, reward logic, campaign setup and reporting.

Would you like to activate this campaign?
```

No fake claim should be made if data is simulated.

If using mock data, include internal flag:
`isSimulation: true`

PHASE 7 — PAYMENT SIMULATOR

Implement campaign payment simulation.

Function:

```ts
simulateSMEPayment(opportunityId, amount)
```

It should:
- mark opportunity as simulated paid
- create SponsoredRewardCampaign
- calculate platform commission
- calculate fan reward budget
- update platform revenue counter in memory/mock store
- return campaign summary

Do not integrate real payment yet.

Prepare architecture for Stripe later.

PHASE 8 — AGENT ORCHESTRATOR

Implement an orchestrator:

```ts
runB2BExpansionAgent(input)
```

Flow:
1. Start AgentRun.
2. Log “Scanning local businesses in {city}...”
3. Discover businesses.
4. Log each discovered business.
5. Score fit.
6. Generate opportunity for top matches.
7. Generate pitch draft.
8. Estimate revenue.
9. Return full AgentRun with logs, businesses, opportunities, pitch drafts and financial summary.

Logs should be structured:

```ts
{
  timestamp,
  level,
  step,
  message,
  data
}
```

Example logs:
- “Scanning Google Places-style provider in Fort-de-France...”
- “Found 8 local businesses.”
- “Scoring Le Sunset Beach Restaurant...”
- “Fit score: 87/100.”
- “Generated €200 campaign opportunity.”
- “Estimated platform commission: €60.”
- “Pitch draft generated. Approval required before outreach.”

PHASE 9 — API ROUTES

Add API routes.

Suggested:

```text
GET /api/b2b-agent/demo
POST /api/b2b-agent/discover
POST /api/b2b-agent/score
POST /api/b2b-agent/opportunity
POST /api/b2b-agent/pitch
POST /api/b2b-agent/run
POST /api/b2b-agent/simulate-payment
GET /api/b2b-agent/runs
GET /api/b2b-agent/opportunities
```

If the app uses Next.js App Router, implement route handlers.

Responses:

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

PHASE 10 — DEBUG SCRIPT

Create:

```bash
npm run debug:b2b-agent
```

or:

```bash
node scripts/debug-b2b-agent.mjs
```

The script should:
1. Load mock creator context.
2. Load mock loyalty stats.
3. Run B2B Expansion Agent for Fort-de-France.
4. Discover mock businesses.
5. Score businesses.
6. Generate top opportunity.
7. Generate pitch.
8. Simulate €200 SME payment.
9. Print:
   - businesses discovered
   - top fit scores
   - opportunity summary
   - generated pitch
   - platform commission
   - fan reward budget
   - final diagnosis

Output example:

```text
[1] B2B Agent Run Started ✅
[2] City: Fort-de-France
[3] Businesses discovered: 8
[4] Top match: Le Sunset Beach Restaurant — Fit Score 87/100
[5] Campaign budget: €200
[6] Fan reward budget: €140
[7] Aura commission: €60
[8] Pitch generated ✅
[9] Simulated SME payment ✅
[10] Sponsored campaign created ✅
```

PHASE 11 — UI INTEGRATION

After backend and debug script work, integrate UI.

Add a major section in the dashboard:

> Agentic B2B Growth Engine

UI components:

1. Header:
   - title
   - explanation
   - “Run Expansion Agent” button

2. Discovery controls:
   - city selector
   - category selector
   - campaign budget input
   - run button

3. Agent terminal:
   - live-looking logs
   - dark terminal styling
   - lime accents
   - timestamps
   - step labels

4. Discovered businesses table/cards:
   - name
   - category
   - city
   - rating
   - Instagram handle
   - fit score

5. Top opportunity card:
   - business name
   - proposed offer
   - budget
   - fan reward budget
   - platform commission
   - estimated reach
   - estimated redemptions
   - estimated business revenue

6. Pitch preview:
   - email/DM text
   - channel selector
   - approval required badge
   - “Approve Agent Outreach” mock button

7. Payment simulation:
   - “Simulate SME Payment (€200)” button
   - platform revenue counter
   - campaign created status

8. Growth flywheel visualization:
   - Creators → Fans → Businesses → Rewards → Revenue → More engagement

Visual style:
- dark premium SaaS
- terminal-inspired agent logs
- lime accent
- mathematical/data intelligence aesthetic
- serious and investor-ready
- no fantasy
- no crypto coin visuals
- no childish illustrations

PHASE 12 — COPYWRITING

Use product copy that makes the concept clear:

Headline:
“Turn local businesses into reward sponsors.”

Subheadline:
“Aura’s B2B Expansion Agent discovers local SMEs, scores partnership fit, and drafts sponsored loyalty campaigns connected to your creator community.”

CTA:
“Run Expansion Agent”

Explainer:
“Businesses fund rewards. Fans redeem locally. Creators grow loyalty. Aura earns commission.”

Safety text:
“Outreach is simulated in this prototype. No business is contacted without approval.”

PHASE 13 — DOCUMENTATION

Create/update documentation:

- README section for B2B Expansion Agent
- how to run debug script
- how mock discovery works
- future Google Places integration
- future Stripe/payment integration
- future outreach/email integration
- safety/compliance note

Add `.env.example` variables if needed:

```text
GOOGLE_PLACES_API_KEY=
B2B_AGENT_MODE=mock
B2B_DEFAULT_COMMISSION_RATE=0.30
B2B_DEFAULT_CAMPAIGN_BUDGET=200
```

Do not require these for mock mode.

PHASE 14 — ACCEPTANCE CRITERIA

You are done when:

1. Existing Instagram Analyzer still works.
2. Existing loyalty/token/agent code is not broken.
3. B2B domain models exist.
4. Mock discovery provider works.
5. Fit scoring engine works.
6. Opportunity engine works.
7. Pitch generator works.
8. Payment simulator works.
9. Agent orchestrator works.
10. API routes exist.
11. `npm run debug:b2b-agent` works.
12. UI section displays the B2B Growth Engine.
13. No real outreach is sent.
14. No real Google Places call is required in mock mode.
15. Documentation explains current mock mode and future integrations.

FINAL SUMMARY

At the end, provide:

- files created
- files modified
- commands run
- debug script results
- what is mocked
- what is ready
- what remains for real Google Places / Stripe / outreach integration

Start by inspecting the project and then execute the implementation.
