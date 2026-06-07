# Aura Product Philosophy

## Core mission

Aura exists to help creators own, activate and monetize their true fan communities.

## Product positioning

**Creator-facing:** Aura helps creators turn their most engaged fans into a rewarded growth community.

**Business-facing:** Aura is a loyalty and rewards OS for creators who want to turn engagement into revenue.

**Local version:** Aura helps local creators transform their superfans into measurable traffic for partner businesses.

**Hero line:** Your next 100 superfans are worth more than 100,000 passive followers.

**Immediate explanation:** Aura gives those 100 superfans a reason to engage, share, show up, buy and bring others.

## Target users

- Creators on any platform (Instagram, TikTok, YouTube, Twitch, Discord, newsletters, events) who want to activate and monetize their real fans.
- Creator operators, agencies and small teams that manage creator-led communities.
- Local businesses that want measurable creator-led traffic from partner campaigns.
- Fans who want their support to mean something beyond a like.

## Problem solved

Creators have attention but not community ownership. The most engaged fans — the ones who would buy, share, show up and bring others — are invisible inside a follower count. There is no system that identifies them, rewards them and activates them into a repeatable growth engine.

The creator cannot currently answer:

- who my real fans are across platforms;
- what actions I should reward to grow faster;
- what rewards or experiences my community is ready to pay for;
- how to let fans signal their interest and earn status;
- how to turn fan activity into measurable traffic or revenue for partners.

## Key principles

### 1. Creators first

Every product decision starts with the creator's outcome: clarity about their community, tools to activate it, revenue from it. Fans and partners benefit as a consequence of creator success, not the other way around.

### 2. Fans get real value

Points, challenges, leaderboards and rewards are not gamification decoration. They are a genuine value exchange: fans trade attention and advocacy for status, perks and access they actually want. Empty rewards are worse than no rewards.

### 3. Points before tokens

Loyalty points are the foundation. Blockchain and token infrastructure is a future upgrade, not the product. The word "token" does not appear in the first screen. Fans never see a wallet, a chart or a blockchain until they have already received value from a simple points system.

### 4. Cross-platform ownership

A fan community should not be held hostage by any single platform. Aura is the community ownership layer that sits above Instagram, TikTok, YouTube, Twitch, Discord, newsletters and offline events. The creator's fan data, points ledger and community graph live in Aura — not in Meta's servers.

**MVP = Instagram-first. Architecture = cross-platform. Positioning = community ownership layer.**

### 5. Instagram-first but not Instagram-dependent

Instagram is the activation wedge because creators are already there. But the product must never present itself as an Instagram tool. Every user story, data model and API route must work with a `PlatformAccount` abstraction, not a hardcoded Instagram reference.

### 6. Businesses enter after fan activation is proven

Partner businesses and B2B campaigns are a revenue layer, not the product entry point. A creator should fully understand Aura's value — Superfan Club, points, challenges, rewards — before any business or sponsorship language appears. B2B is unlocked after a creator has an active community, not before.

### 7. Data is permissioned community intelligence, not raw data for sale

Every data point in Aura is collected with the creator's and fan's awareness. Fan engagement signals, tier status and referral data belong to the creator. Aura does not sell fan data to third parties. The business model is creator subscriptions and campaign commissions, not data monetization.

## Product promise

Aura turns a creator's scattered social following into an owned, activated fan community: identify who the real fans are, give them a reason to engage through challenges and rewards, let them earn status on a leaderboard, invite others through referrals, and unlock partner campaigns once the community is proven.

## Core value-producing workflow

```
Creator launches Superfan Club
→ Fans sign up and earn points through challenges
→ Fans climb leaderboard and redeem rewards
→ Creator sees who the real fans are (dashboard + fan list)
→ Creator invites partner businesses to sponsor campaigns
→ Fans spend locally at partner businesses (QR/coupon attribution)
→ Creator earns commission revenue from verified partner traffic
→ Aura earns platform commission on campaign value
```

## What must be observable in the product

- Whether a metric is real engagement data or a simulation.
- Fan registration status, tier, points balance and challenge completion.
- Creator's community size, activity rate and top fans.
- Reward redemption state and remaining inventory.
- QR/coupon attribution to partner campaigns.
- Revenue from partner campaigns and platform commission.
- Integration readiness and production blockers.

## What must never be faked

- Fan registrations or points balances that were not earned.
- Partner campaign conversions that were not tracked.
- Revenue that did not flow through a real payment system.
- Token or blockchain state that is not backed by a real transaction.
- Follower counts or engagement data not authorized by the creator.

## Activation moment

A creator reaches activation when they can see their first real fan registered in their Superfan Club — someone who signed up, earned points and completed a challenge. Everything before that moment is setup.

## Retention moment

Aura creates retention when the creator has a reason to return weekly to:

- check who earned points and completed challenges;
- approve new rewards and set new challenge targets;
- see the leaderboard and identify rising superfans;
- review QR/coupon redemptions from partner campaigns;
- inspect partner campaign ROI and earnings.

## Pricing hypothesis

- **Superfan Club (free forever):** fan club page, points ledger, leaderboards, challenges, fan signup. Free because this builds the creator's community graph — Aura's primary asset.
- **Creator Pro ($49–99/month):** dashboard, advanced challenge tracking, reward catalog, QR/coupon tracking, referral links, sponsor-ready reports. Paid because this converts community activity into revenue.
- **Agency/Label (custom):** multi-workspace, portfolio dashboard, creator scoring, campaign management.
- **Partner campaigns (5–10% commission):** paid when a real partner campaign runs and generates measurable fan traffic.

## Current product truth

Aura is an MVP with a working loyalty engine, SQLite persistence, mock-safe B2B agent, Stripe Checkout integration and a cross-platform data model. The Superfan Club — fan signup, points, challenges, rewards, leaderboard — is the next build priority. The landing page must reflect this pivot: lead with Superfan Club, not Instagram analysis.
