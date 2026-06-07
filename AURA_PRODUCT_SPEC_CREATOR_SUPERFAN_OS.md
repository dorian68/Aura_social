# Aura Product Spec — Creator Superfan OS

> P0 modules for the Superfan Club build  
> Version 1.0 — 2026-06-07

---

## Cross-platform data model

### Creator

```typescript
{
  id: string                    // UUID
  displayName: string
  bio?: string
  avatarUrl?: string
  city?: string
  niche?: string                // "lifestyle" | "food" | "fitness" | "beauty" | "events" | other
  createdAt: string             // ISO
  updatedAt: string
}
```

### PlatformAccount

The abstraction that replaces hardcoded Instagram references.

```typescript
{
  id: string
  creatorId: string             // FK → Creator.id
  platform: PlatformEnum        // see below
  handle: string                // e.g. "@maya.studio"
  url?: string
  followersCount?: number       // optional, may be null
  connectedStatus: "connected" | "manual" | "disconnected"
  metadata?: Record<string, unknown>   // platform-specific extras
  createdAt: string
  updatedAt: string
}

type PlatformEnum =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitch"
  | "discord"
  | "newsletter"
  | "whatsapp"
  | "offline"
  | "other"
```

### Fan

```typescript
{
  id: string
  email: string                 // primary identity
  displayName?: string
  whatsapp?: string
  city?: string
  referredBy?: string           // Fan.id
  createdAt: string
}
```

### CreatorCommunity (the Superfan Club)

```typescript
{
  id: string
  creatorId: string
  slug: string                  // URL slug, e.g. "maya-studio"
  name: string                  // e.g. "Maya's Superfan Club"
  description?: string
  coverImageUrl?: string
  brandColor?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}
```

### Membership

```typescript
{
  id: string
  communityId: string           // FK → CreatorCommunity.id
  fanId: string                 // FK → Fan.id
  tier: "fan" | "superfan" | "vip"   // calculated from points
  joinedAt: string
  lastActiveAt: string
  referralCode: string          // unique code this fan can share
}
```

### PointsLedger

```typescript
{
  id: string
  fanId: string
  communityId: string
  balance: number               // current points balance
  totalEarned: number           // lifetime earned
  totalSpent: number            // lifetime redeemed
  updatedAt: string
}
```

### PointsTransaction

```typescript
{
  id: string
  fanId: string
  communityId: string
  type: "earn" | "redeem" | "expire" | "adjustment"
  amount: number                // positive = earn, negative = redeem
  source: string                // "challenge_completion" | "referral" | "manual" | "qr_scan" | "coupon"
  sourceId?: string             // e.g. ChallengeCompletion.id
  note?: string
  createdAt: string
}
```

### Challenge

```typescript
{
  id: string
  communityId: string
  title: string
  description?: string
  pointsReward: number
  type: "post" | "visit" | "share" | "signup" | "purchase" | "referral" | "custom"
  status: "draft" | "active" | "ended"
  verificationMethod: "auto" | "manual" | "qr" | "coupon" | "honor"
  maxCompletions?: number       // null = unlimited
  expiresAt?: string
  partnerId?: string            // FK → Partner.id, if sponsored
  createdAt: string
}
```

### ChallengeCompletion

```typescript
{
  id: string
  challengeId: string
  fanId: string
  communityId: string
  status: "pending" | "approved" | "rejected"
  proofUrl?: string             // screenshot, QR scan, etc.
  approvedAt?: string
  approvedBy?: string           // "auto" | Creator.id
  createdAt: string
}
```

### Reward

```typescript
{
  id: string
  communityId: string
  title: string
  description?: string
  imageUrl?: string
  pointsCost: number
  type: "digital" | "physical" | "experience" | "partner_offer"
  stock?: number                // null = unlimited
  redeemed: number
  status: "active" | "paused" | "ended"
  partnerId?: string
  expiresAt?: string
  createdAt: string
}
```

### RewardRedemption

```typescript
{
  id: string
  rewardId: string
  fanId: string
  communityId: string
  status: "pending" | "fulfilled" | "cancelled"
  pointsSpent: number
  fulfillmentNote?: string
  fulfilledAt?: string
  createdAt: string
}
```

### Referral

```typescript
{
  id: string
  referrerId: string            // Fan.id (the fan who shared)
  referredId: string            // Fan.id (the fan who signed up)
  communityId: string
  status: "pending" | "confirmed"
  pointsAwarded: number
  createdAt: string
}
```

### Partner

```typescript
{
  id: string
  name: string
  category: string              // "restaurant" | "gym" | "boutique" | "studio" | other
  city: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  status: "prospect" | "active" | "paused"
  createdAt: string
}
```

### Campaign

```typescript
{
  id: string
  communityId: string
  partnerId: string
  title: string
  description?: string
  budgetAmount: number          // in creator's currency
  commissionRate: number        // e.g. 0.12 = 12%
  commissionAmount: number      // calculated: budget × rate
  status: "draft" | "active" | "ended" | "paid"
  startDate: string
  endDate?: string
  createdAt: string
}
```

### QRCode

```typescript
{
  id: string
  campaignId: string
  challengeId?: string
  code: string                  // unique string used in QR image
  url: string                   // full redirect URL
  scanCount: number
  uniqueScanCount: number
  createdAt: string
}
```

### CouponCode

```typescript
{
  id: string
  campaignId: string
  rewardId?: string
  code: string                  // e.g. "MAYA25"
  discount?: string             // e.g. "25%" or "$5 off"
  usageCount: number
  maxUsage?: number
  expiresAt?: string
  createdAt: string
}
```

---

## P0 Module Specifications

---

### Module 1: Public Creator Club Page

**Purpose:** A public-facing page where fans discover the creator's Superfan Club, see the leaderboard and sign up.

**User story:**
> As a fan, I want to visit a creator's club page, understand what it is, see the leaderboard, and sign up to earn points.

**Inputs:**
- Community slug (URL param: `/club/:slug`)

**Outputs:**
- Creator name, bio, cover image, brand color
- Leaderboard (top 10 fans, points visible)
- Active challenges list
- Active rewards list
- Fan signup form

**Data model:** `CreatorCommunity`, `Membership`, `PointsLedger`, `Challenge`, `Reward`

**API routes:**
- `GET /api/club/:slug` — returns community info, top fans, active challenges, active rewards
- `POST /api/club/:slug/join` — fan signup (see Module 2)

**UI requirements:**
- Mobile-first, minimal Chrome
- Creator's brand color applied to header and CTA button
- Leaderboard shows rank, first name (or display name), points total
- Challenges section: title, points reward, type, status
- Rewards section: title, points cost, image, stock remaining
- Sign-up form: name, email, optional city and WhatsApp

**Empty states:**
- No fans yet: "Be the first to join [Creator]'s Superfan Club"
- No challenges yet: "Challenges coming soon — sign up to be notified"
- No rewards yet: "Rewards coming soon"

**Error states:**
- Slug not found → 404 with "This club doesn't exist yet"
- Community is private → "This club is invite-only"

**Acceptance criteria:**
- [ ] Page loads with correct creator data from slug
- [ ] Leaderboard shows top 10 fans sorted by points (desc)
- [ ] Active challenges are listed with points rewards
- [ ] Active rewards are listed with points cost
- [ ] Fan can complete the signup form and submit
- [ ] Page uses creator's brand color in header

---

### Module 2: Fan Signup

**Purpose:** Allow fans to register for a creator's Superfan Club with minimal friction.

**User story:**
> As a fan, I want to sign up for my favorite creator's club with just my email, so I can start earning points.

**Inputs:**
- `communityId` or `slug`
- `email` (required)
- `displayName` (optional, defaults to email prefix)
- `city` (optional)
- `whatsapp` (optional)
- `referralCode` (optional — from a fan referral link)

**Outputs:**
- `Fan` record created or retrieved (if email already exists)
- `Membership` record created for this community
- Welcome points awarded (configurable: default 50 pts)
- Welcome email sent
- Referral registered if `referralCode` present

**Data model:** `Fan`, `Membership`, `PointsLedger`, `PointsTransaction`, `Referral`

**API routes:**
- `POST /api/club/:slug/join` — body: `{ email, displayName?, city?, whatsapp?, referralCode? }`
- `GET /api/fan/me` — returns current fan's membership status across communities (auth required)

**UI requirements:**
- Inline form on club page (not a redirect)
- Success state: "Welcome to [Club Name]! You earned 50 points just for joining."
- Show fan's starting rank on leaderboard after signup

**Empty states:**
- Already a member: "You're already in this club. [View your profile →]"

**Error states:**
- Invalid email format → "Please enter a valid email"
- Community not found → 404
- Signup disabled → "This club is not currently accepting new members"

**Acceptance criteria:**
- [ ] Fan can sign up with just email
- [ ] Fan record is created or reused if email exists
- [ ] Membership record created with tier = "fan"
- [ ] Welcome points (50) awarded immediately
- [ ] Referral registered and referrer points awarded (configurable: default 100 pts)
- [ ] Duplicate signup gracefully returns "already a member" without error

---

### Module 3: Points Ledger

**Purpose:** Track every fan's points balance with a complete audit trail of transactions.

**User story:**
> As a creator, I want to see every fan's points balance and understand exactly how they earned those points, so I can trust the leaderboard and reward decisions.

**User story (fan):**
> As a fan, I want to see my points balance, total earned and how I earned them, so I can understand my status and what I can redeem.

**Inputs:**
- Fan ID + Community ID

**Outputs:**
- Current balance
- Total earned (lifetime)
- Total spent (lifetime)
- Transaction history (paginated, newest first)

**Data model:** `PointsLedger`, `PointsTransaction`

**Default points rules:**

| Action | Points | Verification |
|---|---|---|
| Join club | 50 | Auto |
| Like (Instagram signal) | 5 | Auto |
| Comment | 15 | Auto |
| Save | 20 | Auto |
| Share | 25 | Auto |
| Challenge completion | 100–500 | Manual/QR |
| Referral (successful) | 100 | Auto |
| QR scan at partner | 200 | QR auto |
| Coupon redemption | 150 | Coupon auto |

**API routes:**
- `GET /api/fan/:fanId/points?communityId=xxx` — returns ledger
- `GET /api/fan/:fanId/transactions?communityId=xxx&page=1` — paginated history
- `POST /api/admin/points/award` — manual award (creator only)
- `POST /api/admin/points/deduct` — manual deduction (creator only)

**UI requirements:**
- Fan view: balance counter (animated), earned/spent summary, last 10 transactions
- Creator dashboard view: fan list sorted by points, search, export

**Error states:**
- Insufficient balance for redemption → "You need X more points to redeem this reward"
- Invalid fan or community → 404

**Acceptance criteria:**
- [ ] Balance is accurate sum of all non-expired transactions
- [ ] Every transaction has a `source` and `sourceId` for auditing
- [ ] Balance cannot go below zero
- [ ] Manual adjustments are logged with creator user ID

---

### Module 4: Challenges

**Purpose:** Give fans specific actions to complete in exchange for points, creating structured engagement.

**User story:**
> As a creator, I want to set challenges for my fans — like "share this post" or "visit our partner store" — so I can reward the engagement that matters most to my community.

**Inputs (creator):**
- Title, description, points reward
- Type (post, visit, share, signup, purchase, referral, custom)
- Verification method (auto, manual, QR, coupon, honor)
- Optional: expiry date, max completions, partner ID

**Inputs (fan completing):**
- Challenge ID
- Optional proof: URL, screenshot upload, QR scan confirmation

**Outputs:**
- `ChallengeCompletion` record (pending or auto-approved)
- Points awarded on approval
- Fan notified

**API routes:**
- `GET /api/club/:slug/challenges` — list active challenges
- `POST /api/challenge/:id/complete` — fan submits completion proof
- `GET /api/admin/challenges/:communityId` — creator: all challenges with completion counts
- `POST /api/admin/challenges` — creator creates challenge
- `PATCH /api/admin/challenges/:id` — creator updates/pauses/ends
- `POST /api/admin/completions/:id/approve` — creator approves pending completion
- `POST /api/admin/completions/:id/reject` — creator rejects

**UI requirements:**
- Fan view: challenge card with title, points, type icon, status
- Completion button + optional proof upload area
- Creator view: challenge list + pending completions queue with approve/reject

**Empty states:**
- No active challenges: "No challenges running right now. Check back soon."
- No pending completions: "All caught up — no pending approvals."

**Error states:**
- Challenge expired → "This challenge has ended"
- Already completed → "You already completed this challenge"
- Max completions reached → "This challenge is full"

**Acceptance criteria:**
- [ ] Creator can create a challenge with all required fields
- [ ] Fan can submit completion with or without proof depending on verification method
- [ ] Auto-verification (QR, coupon) awards points immediately
- [ ] Manual verification requires creator approval before points are awarded
- [ ] Completion status is visible to fan (pending / approved / rejected)

---

### Module 5: Rewards

**Purpose:** Give fans something to spend their points on, creating a reason to earn and keep earning.

**User story:**
> As a creator, I want to offer rewards my fans can redeem with their points — like a DM session, early merch access or a coffee from our partner café — so fans have a reason to keep engaging.

**Inputs (creator):**
- Title, description, image
- Points cost
- Type (digital, physical, experience, partner_offer)
- Stock (optional)
- Optional: expiry date, partner ID

**Inputs (fan redeeming):**
- Reward ID + confirmation

**Outputs:**
- `RewardRedemption` record (pending fulfillment)
- Points deducted from ledger
- Creator notified of redemption
- Fan receives fulfillment instructions

**API routes:**
- `GET /api/club/:slug/rewards` — list active rewards
- `POST /api/reward/:id/redeem` — fan redeems
- `GET /api/admin/rewards/:communityId` — creator: all rewards with redemption counts
- `POST /api/admin/rewards` — creator creates reward
- `PATCH /api/admin/rewards/:id` — creator updates
- `POST /api/admin/redemptions/:id/fulfill` — creator marks fulfilled
- `POST /api/admin/redemptions/:id/cancel` — creator cancels

**UI requirements:**
- Fan: reward card with image, title, points cost, stock remaining
- Redemption confirmation modal: "Spend X points on [Reward]?"
- Creator: pending redemptions queue with fulfill/cancel action

**Empty states:**
- No rewards yet: "Rewards coming soon — keep earning!"
- Out of stock: "This reward is currently unavailable"

**Error states:**
- Insufficient points → "You need X more points for this reward"
- Reward ended → "This reward is no longer available"
- Already redeemed once (if unique) → "You've already redeemed this reward"

**Acceptance criteria:**
- [ ] Fan can browse available rewards sorted by points cost
- [ ] Redeeming deducts points atomically (balance cannot go negative)
- [ ] Stock is decremented on redemption
- [ ] Creator receives notification of each redemption
- [ ] Creator can mark as fulfilled or cancel

---

### Module 6: Leaderboard

**Purpose:** Show fans their rank within the community, creating status, competition and social proof.

**User story:**
> As a fan, I want to see my rank on the leaderboard so I know how I compare to other superfans and what I need to do to move up.

**Inputs:**
- Community slug or ID
- Optional: time period filter (all-time, this month, this week)

**Outputs:**
- Ranked list of fans: rank, display name, points, tier badge
- Current fan's rank and distance from next rank

**API routes:**
- `GET /api/club/:slug/leaderboard?period=alltime|monthly|weekly` — public, top 50
- `GET /api/fan/:fanId/rank?communityId=xxx` — fan's current rank

**UI requirements:**
- Top 3 highlighted (gold/silver/bronze treatment)
- Fan's own row highlighted even if outside top 10
- Tier badge visible (Fan / Superfan / VIP)
- Period selector (all-time, this month)

**Empty states:**
- No fans yet: "Be the first on the leaderboard"
- Fan not yet ranked: "Complete a challenge to appear on the leaderboard"

**Acceptance criteria:**
- [ ] Leaderboard sorted correctly by points (period-filtered)
- [ ] Fan's own position shown even if outside top 10
- [ ] Updates in near-real-time (max 5 min delay)
- [ ] Tie-breaking by join date (earlier = higher rank)

---

### Module 7: Creator Dashboard

**Purpose:** Give creators a clear view of their community activity, fan list, top performers and earnings.

**User story:**
> As a creator, I want to see who my real fans are, how active they are and what my community is worth, so I can make better decisions about what to reward and what to pitch to partners.

**Panels:**
1. Community overview: total fans, active this week, total points awarded, top tier count
2. Fan list: sortable by points, tier, join date, last active; searchable
3. Challenge activity: completion rate per challenge, pending approvals count
4. Reward activity: redemption count per reward, pending fulfillment count
5. Partner campaigns: active campaigns, QR scans, coupon uses, commission earned
6. Sponsor-ready report: one-click PDF/email summary for partner pitch

**API routes:**
- `GET /api/admin/dashboard/:communityId` — summary stats
- `GET /api/admin/fans/:communityId?sort=points&page=1` — fan list
- `GET /api/admin/challenges/:communityId` — challenges with completion rates
- `GET /api/admin/rewards/:communityId` — rewards with redemption counts
- `GET /api/admin/campaigns/:communityId` — campaign performance
- `GET /api/admin/report/:communityId` — sponsor-ready report data

**UI requirements:**
- Stats cards at top with 7-day trend arrows
- Fan list with avatar (initials), name, tier badge, points, last active
- Export fan list as CSV
- One-click "Generate sponsor report" button

**Empty states:**
- No fans yet: setup wizard to promote club page
- No challenges: prompt to create first challenge
- No campaigns: "Ready to attract a partner? Generate a sponsor report."

**Acceptance criteria:**
- [ ] Dashboard loads in < 2s for communities with up to 1,000 fans
- [ ] Fan list is sortable and searchable
- [ ] Challenge completion counts are accurate
- [ ] Reward redemption counts are accurate
- [ ] "Sponsor report" generates a summary with community size, engagement rate, top fan count, challenge activity

---

### Module 8: QR / Coupon Tracking

**Purpose:** Provide verifiable attribution for fan visits to partner businesses.

**User story:**
> As a creator, I want to give my partner business a QR code they can display in their store, so fans earn points for visiting and the business can see exactly how many Aura-verified visits they got.

**User story (fan):**
> As a fan, I want to scan a QR code at a partner store to earn points and prove I completed a visit challenge.

**Inputs (creator):**
- Campaign ID (links QR to a campaign)
- Optional: challenge ID (auto-approves challenge on scan)

**Inputs (fan):**
- QR scan → redirect URL
- OR coupon code entered in-app / at register

**Outputs:**
- `QRCode` scan logged with fan ID, timestamp, location (if permitted)
- Points awarded (if linked to challenge)
- Partner sees scan count in dashboard
- Campaign attribution updated

**API routes:**
- `POST /api/admin/qr` — creator generates QR code for campaign
- `GET /api/qr/:code` — public redirect (logs scan, optionally identifies fan via query param or cookie, then redirects to business URL or confirmation page)
- `POST /api/coupon/redeem` — fan submits coupon code
- `GET /api/admin/qr/:campaignId/stats` — creator: scan stats per campaign

**QR URL format:**
```
https://aura.club/qr/{uniqueCode}?f={fanToken}
```
- `fanToken` is a short-lived JWT generated when the fan is logged in
- If no `fanToken`, scan is logged as anonymous but still counted

**UI requirements:**
- Creator: QR code download (PNG + SVG) + unique URL
- Fan: scan confirmation page ("Nice! You earned 200 points for visiting [Partner].")
- Partner dashboard tile: scan count + timeline

**Acceptance criteria:**
- [ ] QR code generates unique URL
- [ ] Scan is logged with timestamp
- [ ] Fan is identified if fanToken is valid
- [ ] Points awarded immediately if challenge verification = "qr"
- [ ] Creator can see scan count per campaign
- [ ] Coupon redemption follows same attribution logic

---

### Module 9: Referral Links

**Purpose:** Enable fans to grow the community by inviting others, with automatic points rewards for successful referrals.

**User story:**
> As a fan, I want to share a unique link that gives me points when someone signs up using it, so I can grow my rank while helping the creator grow their club.

**Inputs:**
- Fan membership (provides referral code)

**Outputs:**
- Unique URL: `https://aura.club/@creator/join?ref={referralCode}`
- On new fan signup with referral code:
  - `Referral` record created
  - Referrer earns points (default 100 pts)
  - New fan earns welcome bonus (default 50 pts)

**API routes:**
- `GET /api/fan/:fanId/referral-link?communityId=xxx` — generates unique link
- `POST /api/club/:slug/join` — referral code is a param (handled in Module 2)
- `GET /api/admin/referrals/:communityId` — creator: all referrals with attribution

**UI requirements:**
- Fan profile: "Your referral link" with copy button and share count
- Creator dashboard: referral leaderboard (who brought the most fans)

**Acceptance criteria:**
- [ ] Every member gets a unique referral code
- [ ] Signup with valid referral code creates Referral record
- [ ] Referrer earns points once and only once per unique referral
- [ ] Circular referrals (A refers B, B refers A) are detected and blocked

---

### Module 10: Sponsor-Ready Report

**Purpose:** Give creators a document they can share with a potential partner business to prove their community's value.

**User story:**
> As a creator, I want to generate a one-page summary of my community stats — fan count, engagement rate, top fan activity, challenge completions — that I can send to a local business to convince them to sponsor a campaign.

**Inputs:**
- Community ID
- Optional: date range, specific metrics to highlight

**Outputs:**
- Report data object:
  - Community name, creator name, platform accounts
  - Total fans, active last 30 days, tier breakdown
  - Average points per fan, total challenges completed
  - Rewards redeemed
  - Past campaign stats (if any)
  - Estimated campaign impact (projected QR scans based on active fan count)
- Rendered as: JSON (for dashboard), PDF download, shareable link

**API routes:**
- `GET /api/admin/report/:communityId?format=json|pdf` — generate report
- `POST /api/admin/report/:communityId/share` — create shareable link (expires in 7 days)

**Acceptance criteria:**
- [ ] Report generates with accurate data from live database
- [ ] PDF format is clean and brand-consistent
- [ ] Shareable link is valid for 7 days and does not require login
- [ ] Report includes all 7 key metrics (fans, active, tiers, challenges, rewards, past campaigns, projected impact)

---

## Tier calculation

Tier is calculated from total points earned (lifetime), not current balance.

| Tier | Points earned (lifetime) | Display |
|---|---|---|
| Fan | 0–99 | Standard |
| Superfan | 100–999 | Bronze badge |
| VIP | 1000+ | Gold badge |

Creator can customize tier thresholds and labels in settings.

---

## Technical stack (existing + additions)

| Layer | Current | Addition for Superfan OS |
|---|---|---|
| Database | SQLite (WAL mode) | Add: Fan, Membership, Challenge, ChallengeCompletion, QRCode, CouponCode, Referral tables |
| API | Next.js App Router | New routes under /api/club/, /api/fan/, /api/admin/ |
| Auth | NextAuth or JWT | Fan auth via magic link (email); Creator auth via existing auth layer |
| Email | Resend (configured) | Welcome email, redemption notification, weekly digest |
| QR generation | — | `qrcode` npm package |
| PDF | — | `react-pdf` or `puppeteer` for sponsor report |
| Frontend | Vanilla JS (Frontend_Aura) or Next.js | Club page: public HTML, no auth required |
