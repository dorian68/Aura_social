# Aura — Product Spec: Cross-Platform Creator Superfan OS

## Product goal

Build the minimum product that allows Aura to approach creators tomorrow with a free, high-ROI offer:

Launch your Superfan Club in 7 days.  
Identify your top fans.  
Reward engagement.  
Start building a community you own outside the algorithm.

Aura should be cross-platform by design and Instagram-first by MVP.

## Core creator journey

1. Creator creates Aura account.
2. Creator creates public Superfan Club.
3. Creator connects/imports social profile.
4. Creator launches first challenge.
5. Creator adds first rewards.
6. Creator shares club link with fans.
7. Fans join, earn points, invite others.
8. Creator sees top fans and engagement.
9. Creator receives a sponsor-ready community report.

## Core fan journey

1. Fan opens creator club page.
2. Fan joins with email / phone / social login.
3. Fan gets initial points.
4. Fan sees challenges and rewards.
5. Fan completes actions.
6. Fan gains points/status.
7. Fan redeems rewards or unlocks access.
8. Fan invites others.

## P0 — Public Creator Club Page

URL example:

/aura/@creator

Must include:

- creator avatar;
- creator name;
- short description;
- hero promise;
- join button;
- points explanation;
- active challenges;
- available rewards;
- leaderboard preview;
- social links.

Hero copy:

Join [Creator]’s Superfan Club.  
Earn points. Unlock rewards. Help the community grow.

## P0 — Fan Signup

Required:

- email;
- display name;
- optional phone / WhatsApp;
- consent checkbox;
- creator club joined.

Must create:

- fan profile;
- points balance;
- membership in creator community;
- join event.

## P0 — Points System

Simple ledger:

- fan_id;
- creator_id;
- action_type;
- points;
- timestamp;
- source;
- metadata.

Default actions:

- join club: +50;
- invite friend: +100;
- complete challenge: +50–200;
- scan QR code: +150;
- redeem reward: variable;
- event check-in: +200.

## P0 — Challenges

Challenge fields:

- title;
- description;
- points reward;
- start/end date;
- validation type;
- status.

Validation types:

- automatic;
- manual;
- QR code;
- coupon code;
- link click;
- proof upload.

## P0 — Rewards

Reward fields:

- title;
- description;
- cost in points;
- quantity;
- expiration date;
- redemption method;
- optional partner business.

Reward examples:

- early event access;
- private group access;
- shoutout;
- merch discount;
- meetup entry;
- partner discount;
- VIP badge.

## P0 — Leaderboard

Show:

- top fans;
- points;
- rank;
- badges;
- referrals.

Allow privacy settings:

- public display name;
- anonymous mode;
- hidden profile.

## P0 — Creator Dashboard

Must show:

- fans joined;
- top fans;
- points distributed;
- active challenges;
- challenge completions;
- rewards redeemed;
- referrals;
- emails captured;
- fan growth over time.

## P0 — QR / Coupon Tracking

Must support:

- unique QR per challenge;
- unique QR per reward;
- coupon code per campaign;
- redemption count;
- timestamp;
- fan id;
- creator id;
- optional partner id.

## P1 Features

- fan referral links;
- email / WhatsApp capture;
- reward redemption;
- sponsor-ready community report.

Sponsor-ready report should include:

- fans joined;
- active fans;
- top fans;
- referrals;
- challenge completions;
- reward redemptions;
- engagement rate;
- potential sponsor audience.

## P2 Features

- audience overlap;
- partner reward campaigns;
- agency workspace;
- cross-creator analytics.

## Cross-platform data model

Model Aura as:

- Creator
- PlatformAccount
- Fan
- CreatorCommunity
- Membership
- Action
- PointsLedger
- Challenge
- Reward
- Redemption
- Referral
- Partner
- Campaign

PlatformAccount fields:

- creator_id;
- platform;
- handle;
- url;
- followers_count optional;
- verified optional;
- connected_status;
- metadata.

Supported platform enum:

- instagram;
- tiktok;
- youtube;
- twitch;
- discord;
- newsletter;
- whatsapp;
- offline;
- other.

## Minimal demo flow

The demo must show:

1. Creator creates club.
2. Creator creates challenge.
3. Fan joins club.
4. Fan earns points.
5. Fan appears on leaderboard.
6. Fan redeems reward.
7. Creator sees dashboard update.
8. QR/coupon redemption is tracked.

This flow should be testable without real Instagram API.

## Acceptance criteria

The P0 product is ready for creator outreach when:

- A creator can create a public Superfan Club page.
- A fan can join the club.
- A fan can earn points.
- A creator can create challenges.
- A creator can create rewards.
- A fan can redeem at least one reward.
- A leaderboard exists.
- A creator dashboard shows fan activation.
- QR/coupon tracking exists.
- The flow is cross-platform by data model, even if Instagram-first in UX.
- The landing page clearly sells the creator value proposition.