import type { CreatorProfile, LoyaltyProgramStats } from "@/lib/loyalty/types";

export type BusinessCategory =
  | "restaurant"
  | "bar"
  | "fashion"
  | "beauty"
  | "gym"
  | "hotel"
  | "tourism"
  | "event_venue"
  | "local_product"
  | "concept_store"
  | "culture";

export type BusinessDiscoveryStatus = "mock_discovered" | "qualified" | "rejected";
export type B2BSource = "mock_google_places" | "google_places_future";
export type OpportunityStatus = "draft" | "approved" | "simulated_paid" | "archived";
export type CampaignStatus = "draft" | "payment_simulated" | "approved_mock" | "completed";
export type OutreachStatus = "draft" | "approved_mock" | "sent_disabled";
export type AgentRunStatus = "started" | "completed" | "failed";
export type AgentLogLevel = "info" | "warn" | "error";

export interface LocalBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  website?: string;
  phone?: string;
  email?: string;
  instagramHandle?: string;
  googlePlaceId?: string;
  rating: number;
  reviewCount: number;
  priceLevel: 1 | 2 | 3 | 4;
  source: B2BSource;
  discoveryStatus: BusinessDiscoveryStatus;
  createdAt: string;
}

export interface BusinessFitScore {
  businessId: string;
  creatorId: string;
  audienceLocationFit: number;
  categoryFit: number;
  offerFit: number;
  budgetFit: number;
  proximityScore: number;
  culturalFit: number;
  overallScore: number;
  rationale: string[];
}

export interface PartnershipOpportunity {
  id: string;
  creatorId: string;
  businessId: string;
  title: string;
  objective: string;
  proposedBudget: number;
  platformCommissionRate: number;
  platformCommission: number;
  fanRewardBudget: number;
  proposedOffer: string;
  targetSegment: string;
  estimatedReach: number;
  estimatedRedemptions: number;
  estimatedBusinessRevenue: number;
  status: OpportunityStatus;
  createdAt: string;
}

export interface SponsoredRewardCampaign {
  id: string;
  partnershipOpportunityId: string;
  creatorId: string;
  businessId: string;
  name: string;
  budget: number;
  fanRewardBudget: number;
  platformCommission: number;
  rewardType: "discount" | "points_bonus" | "event_access" | "local_offer";
  promoCode: string;
  pointsBonus: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  performance: {
    estimatedReach: number;
    estimatedRedemptions: number;
    estimatedBusinessRevenue: number;
    platformRevenue: number;
  };
}

export interface OutreachDraft {
  id: string;
  businessId: string;
  creatorId: string;
  channel: "email" | "instagram_dm" | "crm_note";
  subject: string;
  message: string;
  tone: "warm" | "direct" | "premium";
  callToAction: string;
  status: OutreachStatus;
  approvalRequired: boolean;
  createdAt: string;
}

export interface AgentLog {
  ts: string;
  level: AgentLogLevel;
  message: string;
  data?: Record<string, string | number | boolean | null>;
}

export interface AgentRun {
  id: string;
  agentName: "Aura B2B Expansion Agent";
  location: string;
  categories: BusinessCategory[];
  status: AgentRunStatus;
  logs: AgentLog[];
  businessesDiscovered: number;
  opportunitiesGenerated: number;
  revenuePotential: number;
  createdAt: string;
  completedAt?: string;
}

export interface B2BDiscoveryInput {
  location: string;
  categories: BusinessCategory[];
  limit?: number;
}

export interface B2BContext {
  creator: CreatorProfile;
  loyaltyStats: LoyaltyProgramStats;
  activeFans: number;
  topFanCount: number;
  platformCommissionRate: number;
}

export interface PaymentSimulation {
  opportunityId: string;
  campaignBudget: number;
  fanRewardBudget: number;
  platformCommission: number;
  platformCommissionRate: number;
  paymentStatus: "simulated_paid";
  platformRevenue: number;
  message: string;
}

export interface B2BAgentState {
  businesses: LocalBusiness[];
  fitScores: BusinessFitScore[];
  opportunities: PartnershipOpportunity[];
  outreachDrafts: OutreachDraft[];
  campaigns: SponsoredRewardCampaign[];
  runs: AgentRun[];
  platformRevenue: number;
}

export interface B2BAgentRunResult {
  run: AgentRun;
  businesses: LocalBusiness[];
  scores: BusinessFitScore[];
  bestOpportunity: PartnershipOpportunity;
  pitch: OutreachDraft;
  campaignEconomics: PaymentSimulation;
  sponsoredCampaign: SponsoredRewardCampaign;
}
