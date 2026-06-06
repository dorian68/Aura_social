# Aura — B2B Expansion Agent Context  
## Agentic Growth Loop + Hyperlocal Partner Network

## 1. Product Context

Aura is a creator monetization platform.

The Instagram Analyzer is already built and acts as the acquisition hook.

The next layers of the product are:

```text
Instagram Analyzer
→ Loyalty points economy
→ Tokenized fan passes / rewards
→ Agentic creator monetization
→ B2B Expansion Agent
→ Hyperlocal partner network
→ Platform revenue flywheel
```

This document defines the **B2B Expansion Agent** layer.

The goal is to give Aura the ability to grow economically by connecting creators’ communities with real-world businesses.

---

## 2. Strategic Thesis

Aura should not only help creators monetize their own fans.

Aura should also help local businesses buy access to highly engaged communities through loyalty-funded campaigns.

The platform becomes:

> An agentic, hyperlocal ad network powered by creator communities, loyalty points, tokenized rewards and AI-led B2B partnership automation.

This is not a classic ad platform.

It is not “boost my post.”

It is not a speculative crypto marketplace.

It is a new model:

```text
Creators generate fan engagement
→ Fans earn loyalty points
→ Local businesses sponsor rewards/promos
→ Fans spend locally
→ Businesses get measurable traffic
→ Creators get stronger communities
→ Aura takes a commission
```

---

## 3. Market Logic

This combines several existing market trends:

1. **Local business lead generation**
   - Tools like Clay, Apollo, PhantomBuster-style workflows, Google Places data and enrichment tools help identify and contact businesses.

2. **Loyalty platforms**
   - Traditional loyalty tools help brands retain customers with points, rewards and offers.

3. **Creator economy**
   - Creators have attention but struggle to monetize beyond ads, sponsorships and merch.

4. **Agentic AI**
   - Agents can research, qualify, personalize outreach, draft campaigns and eventually execute workflows.

5. **Hyperlocal commerce**
   - Local businesses need traffic and measurable ROI, especially restaurants, events, boutiques, gyms, tourism businesses and cultural venues.

Aura’s innovation is the fusion:

```text
Lead generation agent
+ local business intelligence
+ creator community loyalty economy
+ AI-generated partnership pitch
+ sponsored rewards
+ measurable fan activation
```

---

## 4. Why This Matters

Without the B2B Expansion Agent, Aura is mainly a creator SaaS.

With the B2B Expansion Agent, Aura becomes a **network business**.

It creates a flywheel:

```text
More creators
→ more fan communities
→ more local business opportunities
→ more sponsored rewards
→ more platform revenue
→ more value for fans
→ stronger creator retention
→ more data
→ better agent recommendations
```

This is what can make the platform attractive to investors.

It turns Aura from:

> “A tool for creators”

into:

> “An agentic community commerce network.”

---

## 5. Core Business Model

The B2B Expansion Agent discovers local SMEs and proposes sponsored loyalty campaigns.

Example:

A restaurant pays €200 to sponsor a campaign.

Budget split:

```text
€200 campaign budget
→ 70% converted into fan rewards / promo value / points-funded incentives
→ 30% kept by Aura as platform commission
```

For a €200 campaign:

```text
Fan reward budget: €140
Aura commission: €60
```

This can later become configurable by campaign type.

Possible monetization models:

- platform commission on sponsored campaigns
- SaaS fee for businesses
- SaaS fee for creators
- premium agent automation
- campaign success fee
- partner network fee
- wallet/tokenization fees later
- agency/label multi-creator plan

---

## 6. Key User Types

### Creator

A creator with an audience and loyalty program.

They want:

- more rewards for fans
- more community activity
- more revenue
- local partnerships
- less manual outreach

### Local Business / SME

A business that wants customers.

Examples:

- restaurant
- bar
- fashion store
- beauty salon
- gym
- hotel
- tourism operator
- event venue
- local product brand
- concept store
- rum brand
- food truck
- cultural venue

They want:

- traffic
- visibility
- measurable local customer acquisition
- promo code distribution
- partnership with trusted creators
- better ROI than generic ads

### Fan / Customer

A fan who earns loyalty points and receives offers.

They want:

- recognition
- rewards
- discounts
- experiences
- access
- relevant local offers

### B2B Expansion Agent

An AI agent that discovers and qualifies businesses, then drafts partnership campaigns.

---

## 7. Agent Responsibilities

The B2B Expansion Agent should:

1. Discover businesses by location and category.
2. Enrich businesses with public information.
3. Estimate fit with a creator/community.
4. Generate a partnership pitch.
5. Simulate campaign economics.
6. Recommend budget, offer and expected impact.
7. Create campaign drafts.
8. Log all steps.
9. Require human approval before outreach or campaign launch.

The MVP should simulate or mock external actions first.

No autonomous real-world contacting should happen without explicit approval.

---

## 8. External Data Sources

Future real integrations may include:

- Google Places API
- Google Maps data
- business websites
- Instagram public/business profile data
- Meta/Instagram APIs where permitted
- email enrichment APIs
- CRM tools
- WhatsApp Business API
- email sending provider
- payment processor
- internal loyalty/fan data

For the MVP:

- implement mock Google Places-like discovery
- design the API abstraction for real Google Places later
- use mock SMEs
- use mock creator loyalty pool
- generate realistic but clearly simulated pitches

---

## 9. Core Product Objects

Add the following concepts.

### LocalBusiness

Represents a business discovered by the agent.

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

---

### BusinessFitScore

Represents how well a business matches a creator/community.

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

---

### PartnershipOpportunity

Represents a possible campaign between a creator and a business.

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

---

### SponsoredRewardCampaign

Represents an approved campaign.

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

---

### OutreachDraft

Represents the message generated by the agent.

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

---

### AgentRun

Represents one autonomous agent discovery session.

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

---

## 10. MVP Flow

The MVP flow should be:

```text
1. Creator has a loyalty program and fan community
2. User opens “B2B Growth Engine”
3. User selects location: Fort-de-France, Pointe-à-Pitre, Basse-Terre, etc.
4. User selects business categories: restaurants, fashion, bars, beauty, events, gyms
5. Agent simulates Google Places search
6. Agent returns local SMEs
7. Agent computes fit score
8. Agent generates campaign opportunity
9. Agent drafts outreach message
10. UI displays logs in terminal style
11. User can simulate SME payment
12. Platform revenue counter increases by commission
13. Campaign is stored as simulated/approved
```

---

## 11. Example Agent Pitch

Example message:

```text
Bonjour Le Sunset Beach Restaurant,

Aura’s agent detected a strong local opportunity between your restaurant and the community of Luna Beats.

Luna’s fans generated 50,000 loyalty points this month, and a large share of her most engaged audience is active near Fort-de-France.

We propose a €200 sponsored loyalty campaign:
- €140 converted into fan rewards and promo incentives
- €60 platform orchestration fee
- custom promo code distributed to top fans
- automated campaign tracking through Aura

Example activation:
“Show this code before Luna’s concert and get 15% off your dinner.”

Aura handles targeting, reward logic, campaign setup and reporting.

Would you like to activate this campaign?
```

---

## 12. Financial Logic

Default campaign economics:

```text
campaignBudget = 200
platformCommissionRate = 0.30
platformCommission = campaignBudget * 0.30
fanRewardBudget = campaignBudget * 0.70
```

Also calculate:

- estimated redemptions
- estimated business revenue
- estimated fan reward value
- platform revenue
- creator benefit
- fan benefit

Example assumptions:

```text
estimatedReach = creatorActiveFans * locationFit
estimatedRedemptions = estimatedReach * redemptionRate
estimatedBusinessRevenue = estimatedRedemptions * averageOrderValue
```

All assumptions should be visible and adjustable later.

---

## 13. UI Requirements

Add a new major dashboard section:

> Agentic B2B Growth Engine

Sections:

1. Agent terminal logs
2. Discovery filters
3. Discovered businesses
4. Fit score
5. Partnership opportunity
6. Generated pitch
7. Campaign economics
8. Platform revenue counter
9. Simulate SME payment button
10. Approve Agent Outreach button

Important:
For MVP, “Approve Agent Outreach” should be mock/simulated only unless real email/DM infrastructure is configured.

Visual direction:

- dark premium SaaS
- lime accents
- terminal-style agent logs
- mathematical/data intelligence aesthetic
- no crypto-bro visuals
- no childish design
- no fantasy
- more “AI operating system for local community commerce”

---

## 14. API Endpoints

Suggested endpoints:

```text
GET /api/b2b-agent/demo
POST /api/b2b-agent/discover
POST /api/b2b-agent/score
POST /api/b2b-agent/opportunity
POST /api/b2b-agent/pitch
POST /api/b2b-agent/simulate-payment
GET /api/b2b-agent/runs
GET /api/b2b-agent/opportunities
```

Responses should follow:

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

## 15. Backend-First Development

Use the backend-first debugging paradigm.

Create debug script:

```bash
npm run debug:b2b-agent
```

The script should:

1. Create/load demo creator.
2. Create/load demo loyalty program.
3. Simulate discovery in a Caribbean city.
4. Return mock local businesses.
5. Score each business.
6. Generate partnership opportunities.
7. Generate pitch messages.
8. Simulate a €200 SME payment.
9. Calculate Aura commission.
10. Print a structured diagnosis and summary.

Do not debug this only through UI.

---

## 16. Safety / Compliance

Do not send real emails or DMs automatically.

Do not scrape websites unless explicitly implemented and allowed.

Do not contact businesses without user approval.

Google Places integration should be abstracted and optional.

For MVP, use mock providers.

Clearly label simulated data.

Never log API keys or secrets.

Add future integration notes for:

- Google Places API
- email sending
- CRM export
- payment processor
- campaign tracking

---

## 17. Success Criteria

This layer is successful if:

- Aura can simulate local business discovery.
- It can score business/creator fit.
- It can generate B2B partnership opportunities.
- It can generate localized outreach pitches.
- It can simulate campaign economics.
- It can calculate platform commission.
- It can display the growth loop in the UI.
- It can run in CLI via debug script.
- It does not send real outreach without approval.
- It reinforces Aura’s investor story as an agentic growth loop.
