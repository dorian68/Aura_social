# Aura — Business Model

> Version 2.0 — Creator Superfan OS  
> Updated: 2026-06-07

---

## The flywheel

```
Creator launches free Superfan Club
        ↓
Fans register and earn points (community graph builds)
        ↓
Challenges and rewards activate recurring engagement
        ↓
Creator sees who real fans are (dashboard intelligence)
        ↓
Creator upgrades to Pro for advanced features
        ↓
Local partners pay to run fan-activated campaigns
        ↓
Aura earns commission on verified fan traffic
        ↓
Creator earns revenue → shares success → attracts new creators
```

---

## Revenue streams

### Stream 1: Creator Pro subscription (primary)

| Tier | Price | What it unlocks |
|---|---|---|
| **Superfan Club (free)** | $0/forever | Club page, fan signup, points, leaderboard, challenges, basic rewards |
| **Creator Pro** | $49–99/month | Full dashboard, advanced challenges, reward catalog, QR/coupon tracking, referral links, sponsor-ready reports |
| **Agency / Label** | $199–499/month | Multi-workspace, portfolio dashboard, team access, bulk creator management |

**Why free forever:** The free tier creates the community graph — fan emails, engagement signals, points history. This is Aura's core asset, not just an acquisition tool. Every fan that signs up on a free creator's club is a proof point for the paid tier.

**When a creator pays:** When they have enough active fans that the dashboard, QR tracking and partner reports create clear ROI. Target: upgrade after 50–100 fan signups.

**Conversion hypothesis:** 15–20% of active creators convert from free to Pro within 60 days of first fan signup.

### Stream 2: Partner campaign commission (secondary, high-value)

When a creator runs a partner campaign (local business sponsoring a reward or challenge):

- Creator sets the campaign budget (e.g., $200 for a coffee shop campaign)
- Aura charges 10–15% platform commission ($20–30)
- Partner tracks fan visits via QR code or coupon redemption
- Creator earns the remaining campaign budget as partner revenue

**Why this works at scale:** At 100 creators × 2 campaigns/month × $300 avg budget × 12% commission = **$72K ARR from commission alone** before subscription revenue.

**Why this doesn't work first:** Commission revenue requires active fan communities and real partner relationships. Cannot be automated before community activation is proven.

### Stream 3: Referral revenue sharing (future)

Creator earns a percentage of Aura subscription fees for creators they refer. Creates a creator-driven growth flywheel without paid acquisition cost.

### Stream 4: Token / fan pass infrastructure (future, not primary)

When blockchain fan passes are live:
- Aura charges a mint fee (e.g., 2.5% of fan pass launch revenue)
- Ongoing secondary market royalties (e.g., 1–2% of resale value)
- Premium "token-gated" club features as an upsell

**Not in MVP.** Token language is secondary. This unlocks after SaaS revenue is proven.

---

## Unit economics

### Creator Pro at $79/month

| Metric | Value |
|---|---|
| CAC (pilot phase, white-glove) | ~$200–400 |
| LTV at 18-month avg retention | $79 × 18 = $1,422 |
| LTV:CAC ratio | ~4:1 |
| Breakeven | ~month 3 |

### Partner campaign commission at 12%

| Scenario | Value |
|---|---|
| Avg campaign budget | $300 |
| Commission per campaign | $36 |
| Campaigns per creator/month | 2 |
| Revenue per active creator/month | $72 |
| 50 active creators | $3,600/month commission |

### Combined at 100 paying creators + 50 with active partner campaigns

| Revenue source | Monthly |
|---|---|
| 80 × Creator Pro at $79 | $6,320 |
| 20 × Agency at $249 | $4,980 |
| 50 × partner commission ($72 avg) | $3,600 |
| **Total MRR** | **$14,900** |
| **ARR** | **~$179K** |

This is a realistic 12-month target if pilot phase succeeds.

---

## Cost structure (MVP phase)

| Cost | Monthly est. |
|---|---|
| Infrastructure (Vercel + DB + storage) | $200–500 |
| Meta / Google APIs | $50–200 |
| Stripe fees (2.9% + 30¢ per transaction) | Variable |
| Founder salary (deferred in pilot) | $0–variable |
| **Total fixed costs** | **~$500–700** |

Aura can reach profitability at 15–20 paying Creator Pro subscribers. This is achievable within the pilot phase.

---

## The SaaS vs. commission tension (resolved)

Previous analysis identified this as a conflict. Resolution:

**SaaS is primary. Commission is secondary.**

- SaaS provides predictable revenue and direct creator feedback.
- Commission scales with partner campaign volume, which only grows after SaaS retention is proven.
- Decision: Build for SaaS first. Treat commission as a positive surprise, not the plan.

**When commission becomes primary:** After 200+ active creators with proven community activation. At that point, commission revenue could exceed SaaS revenue.

---

## Cold start strategy (solved)

The three-sided marketplace problem (creator + fan + business) is solved by sequencing:

1. **Phase 1 — Creator only:** Launch Superfan Club. Creator gets value from fan signup + dashboard. No business needed.
2. **Phase 2 — Creator + Fan:** Fan earns points and completes challenges. Creator gets community data. Still no business needed.
3. **Phase 3 — Add business:** Only after creator has ≥50 active fans does Aura introduce partner campaign opportunity. Business has something to buy into.

**Key insight:** The fan community creates demand from businesses, not the other way around. Never pitch the business before the fan community is real.

---

## Meta dependency risk mitigation

| Risk | Mitigation |
|---|---|
| Meta API change breaks Instagram connector | Cross-platform architecture: TikTok, YouTube as fallback signal sources |
| Meta launches its own loyalty/community tool | Aura's advantage is the creator-owned community graph (portable across platforms) |
| Creator migrates from Instagram to TikTok | Fan club page and points ledger stay in Aura regardless of platform |
| Instagram revokes private insights access | Public signal analysis + fan-generated data as primary signals |

**Core defense:** The fan community graph, points ledger and challenge history live in Aura — not in Meta. A creator who loses their Instagram account still has their Superfan Club.

---

## Fundraising readiness (not yet)

Current state: MVP with technical credibility but 0 paying customers.

Investor narrative will be ready when:

- ≥3 creators have ≥100 fan signups in their Superfan Club
- ≥1 real partner campaign with QR-verified fan traffic
- ≥1 paying Creator Pro subscriber (not pilot/free)

At that point, the narrative is: "We have creators, fans and paying businesses. We need capital to scale the community graph and automate partner matching."

---

## What we will NOT do

- Sell fan data to third parties.
- Launch paid tiers before free tier value is proven.
- Automate partner campaigns before manual campaigns succeed.
- Lead with token/blockchain in any pricing conversation.
- Take on large enterprise contracts before the self-serve product works.
