export type TokenizationMode = "offchain" | "onchain_simulated" | "onchain_live";
export type LoyaltyProgramStatus = "draft" | "active" | "paused";
export type AgentRecommendationStatus = "pending" | "approved" | "rejected" | "executed";
export type RecommendationPriority = "low" | "medium" | "high" | "urgent";

export type LoyaltyActionType =
  | "like"
  | "comment"
  | "save"
  | "share"
  | "purchase"
  | "event_attendance"
  | "referral"
  | "manual_bonus"
  | "reward_redemption";

export type LoyaltyRuleSource =
  | "instagram"
  | "manual"
  | "purchase"
  | "event"
  | "referral"
  | "custom";

export type FanTier = "New Fan" | "Engaged Fan" | "Superfan" | "Inner Circle";

export type RewardType =
  | "discount"
  | "early_access"
  | "exclusive_content"
  | "event_access"
  | "merch"
  | "private_community"
  | "badge"
  | "custom";

export type RewardStatus = "draft" | "active" | "paused" | "archived";

export type FanPassTier =
  | "bronze"
  | "silver"
  | "gold"
  | "vip"
  | "inner_circle"
  | "event";

export type FanPassStatus = "draft" | "active" | "paused" | "sold_out";

export type CampaignChannel =
  | "instagram_dm"
  | "instagram_story"
  | "instagram_post"
  | "email"
  | "whatsapp"
  | "in_app";

export type CampaignStatus = "draft" | "approved" | "scheduled" | "executed" | "paused";

export type RecommendationType =
  | "campaign"
  | "reward"
  | "pricing"
  | "dm"
  | "fan_segment"
  | "token_economy"
  | "risk"
  | "opportunity";

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  category: string;
  region: string;
  connectedInstagramAccount?: string;
  connectedWallet?: string;
  loyaltyProgramId?: string;
  createdAt: string;
}

export interface LoyaltyProgram {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  pointsName: string;
  pointsSymbol: string;
  status: LoyaltyProgramStatus;
  tokenizationMode: TokenizationMode;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyRule {
  id: string;
  programId: string;
  actionType: LoyaltyActionType;
  points: number;
  pointsPerUnit?: number;
  active: boolean;
  description: string;
  source: LoyaltyRuleSource;
  createdAt: string;
  updatedAt: string;
}

export interface FanProfile {
  id: string;
  programId: string;
  displayName: string;
  instagramHandle?: string;
  email?: string;
  phone?: string;
  walletAddress?: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: FanTier;
  tags: string[];
  passIds: string[];
  lastInteractionAt: string;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  programId: string;
  fanId: string;
  actionType: LoyaltyActionType;
  pointsDelta: number;
  source: LoyaltyRuleSource;
  referenceId?: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface Reward {
  id: string;
  programId: string;
  name: string;
  description: string;
  costInPoints: number;
  rewardType: RewardType;
  stock: number | null;
  redeemedCount: number;
  status: RewardStatus;
  imageUrl?: string;
  unlockCondition?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardEligibility {
  eligible: boolean;
  reason: string;
  missingPoints: number;
  rewardId: string;
  fanId: string;
}

export interface FanPass {
  id: string;
  programId: string;
  name: string;
  tier: FanPassTier;
  price: number;
  currency: "EUR" | "USD";
  supply: number;
  holders: number;
  benefits: string[];
  tokenContractAddress?: string;
  tokenId?: number;
  status: FanPassStatus;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassLaunchSimulation {
  passId?: string;
  expectedConversionRate: number;
  estimatedRevenue: number;
  estimatedPassHolders: number;
  supplyRemaining: number;
  priceRecommendation: string;
  supplyRecommendation: string;
}

export interface TokenEconomy {
  programId: string;
  totalSupply: number;
  launchAirdropPool: number;
  creatorReserve: number;
  communityRewardsPool: number;
  partnerRewardsPool: number;
  campaignBufferPool: number;
  isTransferable: boolean;
  isSpeculative: boolean;
  pointsToTokenRatio: number;
  fanPassAllocation: number;
  redemptionPressure: number;
  estimatedLiability: number;
  tokenizationMode: TokenizationMode;
  disclaimer: string;
}

export interface TokenEconomyValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface AgentRecommendation {
  id: string;
  programId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  message: string;
  rationale: string;
  suggestedAction: string;
  expectedImpact: string;
  confidence: number;
  status: AgentRecommendationStatus;
  createdAt: string;
}

export interface CampaignDraft {
  channel: CampaignChannel;
  audience: string;
  message: string;
  cta: string;
  approvalRequired: boolean;
}

export interface Campaign {
  id: string;
  programId: string;
  name: string;
  objective: string;
  channel: CampaignChannel;
  targetSegment: string;
  rewardId?: string;
  message: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  performance: {
    estimatedReach: number;
    estimatedConversions: number;
    estimatedRevenue: number;
  };
  createdAt: string;
}

export interface FanSegment {
  name: string;
  description: string;
  fanCount: number;
  fanIds: string[];
  averageBalance: number;
}

export interface LoyaltyProgramStats {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  outstandingLiability: number;
  activeFans: number;
  rewardsRedeemed: number;
  averageFanBalance: number;
  tierCounts: Record<FanTier, number>;
}

export interface LoyaltyState {
  creators: CreatorProfile[];
  programs: LoyaltyProgram[];
  rules: LoyaltyRule[];
  fans: FanProfile[];
  transactions: LoyaltyTransaction[];
  rewards: Reward[];
  fanPasses: FanPass[];
  tokenEconomies: TokenEconomy[];
  recommendations: AgentRecommendation[];
  campaigns: Campaign[];
}

export interface CreateProgramInput {
  creatorId: string;
  name: string;
  description?: string;
  pointsName?: string;
  pointsSymbol?: string;
  status?: LoyaltyProgramStatus;
  tokenizationMode?: TokenizationMode;
}

export interface AwardPointsInput {
  programId: string;
  fanId: string;
  actionType: LoyaltyActionType;
  quantity?: number;
  monetaryAmount?: number;
  pointsOverride?: number;
  source?: LoyaltyRuleSource;
  referenceId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface RedeemPointsInput {
  programId: string;
  fanId: string;
  points: number;
  referenceId?: string;
  metadata?: Record<string, string | number | boolean>;
}
