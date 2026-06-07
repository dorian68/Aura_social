export type Platform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitch"
  | "discord"
  | "newsletter"
  | "whatsapp"
  | "offline"
  | "other";

export type ConnectedStatus = "connected" | "manual" | "disconnected";
export type MembershipTier = "fan" | "superfan" | "vip";
export type TxType = "earn" | "redeem" | "expire" | "adjustment";
export type TxSource =
  | "join_welcome"
  | "challenge_completion"
  | "referral"
  | "manual"
  | "qr_scan"
  | "coupon"
  | "instagram_signal"
  | "tiktok_signal"
  | "youtube_signal"
  | "other";
export type ChallengeType = "post" | "visit" | "share" | "signup" | "purchase" | "referral" | "custom";
export type VerificationMethod = "auto" | "manual" | "qr" | "coupon" | "honor";
export type ChallengeStatus = "draft" | "active" | "ended";
export type CompletionStatus = "pending" | "approved" | "rejected";
export type RewardType = "digital" | "physical" | "experience" | "partner_offer";
export type RewardStatus = "active" | "paused" | "ended";
export type RedemptionStatus = "pending" | "fulfilled" | "cancelled";
export type PartnerStatus = "prospect" | "active" | "paused";
export type CampaignStatus = "draft" | "active" | "ended" | "paid";

export interface Creator {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  niche?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAccount {
  id: string;
  creatorId: string;
  platform: Platform;
  handle: string;
  url?: string;
  followersCount?: number;
  connectedStatus: ConnectedStatus;
  tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Fan {
  id: string;
  email: string;
  displayName?: string;
  whatsapp?: string;
  city?: string;
  referredBy?: string;
  createdAt: string;
}

export interface FanPlatformAccount {
  id: string;
  fanId: string;
  platform: Platform;
  handle: string;
  url?: string;
  followersCount?: number;
  connectedStatus: ConnectedStatus;
  tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorCommunity {
  id: string;
  creatorId: string;
  slug: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  brandColor: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  communityId: string;
  fanId: string;
  tier: MembershipTier;
  referralCode: string;
  joinedAt: string;
  lastActiveAt: string;
}

export interface PointsLedger {
  id: string;
  fanId: string;
  communityId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
}

export interface PointsTransaction {
  id: string;
  fanId: string;
  communityId: string;
  type: TxType;
  amount: number;
  source: TxSource;
  sourceId?: string;
  note?: string;
  createdAt: string;
}

export interface Challenge {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  pointsReward: number;
  type: ChallengeType;
  status: ChallengeStatus;
  verificationMethod: VerificationMethod;
  maxCompletions?: number;
  expiresAt?: string;
  partnerId?: string;
  completionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeCompletion {
  id: string;
  challengeId: string;
  fanId: string;
  communityId: string;
  status: CompletionStatus;
  proofUrl?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  pointsCost: number;
  type: RewardType;
  stock?: number;
  redeemed: number;
  status: RewardStatus;
  partnerId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  fanId: string;
  communityId: string;
  status: RedemptionStatus;
  pointsSpent: number;
  fulfillmentNote?: string;
  fulfilledAt?: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  communityId: string;
  status: "pending" | "confirmed";
  pointsAwarded: number;
  createdAt: string;
}

export interface Partner {
  id: string;
  creatorId?: string;
  name: string;
  category?: string;
  city?: string;
  address?: string;
  contactEmail?: string;
  website?: string;
  status: PartnerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  communityId: string;
  partnerId: string;
  title: string;
  description?: string;
  budgetAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CampaignStatus;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QRCode {
  id: string;
  campaignId?: string;
  challengeId?: string;
  code: string;
  redirectUrl: string;
  scanCount: number;
  uniqueScanCount: number;
  createdAt: string;
}

export interface CouponCode {
  id: string;
  campaignId?: string;
  rewardId?: string;
  code: string;
  discount?: string;
  usageCount: number;
  maxUsage?: number;
  expiresAt?: string;
  createdAt: string;
}

// Computed tier thresholds
export const TIER_THRESHOLDS: Record<MembershipTier, number> = {
  fan: 0,
  superfan: 100,
  vip: 1000,
};

export function computeTier(totalEarned: number): MembershipTier {
  if (totalEarned >= TIER_THRESHOLDS.vip) return "vip";
  if (totalEarned >= TIER_THRESHOLDS.superfan) return "superfan";
  return "fan";
}

// Default points rules
export const DEFAULT_POINTS = {
  join_welcome: 50,
  referral_referrer: 100,
  referral_new_fan: 50,
  qr_scan: 200,
  coupon: 150,
} as const;
