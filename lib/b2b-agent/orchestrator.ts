import { scoreBusinesses, scoreBusinessFit } from "./fitScoringEngine";
import { defaultB2BCategories, discoverMockPlaces } from "./mockGooglePlacesProvider";
import { generateOpportunities, generatePartnershipOpportunity } from "./opportunityEngine";
import { simulateSmePayment } from "./paymentSimulator";
import { generateB2BPitch } from "./pitchGenerator";
import { getB2BAgentState, setB2BAgentState } from "./store";
import type {
  AgentLog,
  AgentRun,
  B2BAgentRunResult,
  B2BContext,
  B2BDiscoveryInput,
  BusinessCategory,
  LocalBusiness,
} from "./types";
import { calculateProgramStats, getTopFans } from "../loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "../loyalty/store";

export function buildB2BContext(): B2BContext {
  const loyaltyState = getLoyaltyState();
  const programId = getDemoProgramId();
  const creator = loyaltyState.creators[0];
  const stats = calculateProgramStats(loyaltyState, programId);
  const topFans = getTopFans(loyaltyState, programId, 25);

  if (!creator) {
    throw new Error("Demo creator is missing.");
  }

  return {
    creator,
    loyaltyStats: stats,
    activeFans: stats.activeFans,
    topFanCount: topFans.length,
    platformCommissionRate: 0.3,
  };
}

export function discoverBusinesses(input: Partial<B2BDiscoveryInput> = {}) {
  return discoverMockPlaces({
    location: input.location || "Fort-de-France",
    categories: input.categories?.length ? input.categories : defaultB2BCategories,
    limit: input.limit || 8,
  });
}

export function scoreDiscoveredBusinesses(
  businesses: LocalBusiness[],
  location = "Fort-de-France",
) {
  return scoreBusinesses(businesses, buildB2BContext(), location);
}

export function createOpportunityForBusiness(
  business: LocalBusiness,
  proposedBudget = 200,
  location = business.city,
) {
  const context = buildB2BContext();
  const score = scoreBusinessFit(business, context, location);
  return generatePartnershipOpportunity({
    business,
    score,
    context,
    proposedBudget,
  });
}

export function runB2BExpansionAgent({
  location = "Fort-de-France",
  categories = defaultB2BCategories,
  campaignBudget = 200,
}: {
  location?: string;
  categories?: BusinessCategory[];
  campaignBudget?: number;
} = {}): B2BAgentRunResult {
  const logs: AgentLog[] = [];
  const run: AgentRun = {
    id: `b2b_run_${Date.now()}`,
    agentName: "Aura B2B Expansion Agent",
    location,
    categories,
    status: "started",
    logs,
    businessesDiscovered: 0,
    opportunitiesGenerated: 0,
    revenuePotential: 0,
    createdAt: new Date().toISOString(),
  };

  addLog(logs, "info", "Agent run started", { location, categoryCount: categories.length });
  const context = buildB2BContext();
  addLog(logs, "info", "Loaded creator and loyalty stats", {
    creatorId: context.creator.id,
    activeFans: context.activeFans,
    totalPointsIssued: context.loyaltyStats.totalPointsIssued,
  });

  const businesses = discoverBusinesses({ location, categories });
  addLog(logs, "info", "Mock Google Places discovery completed", {
    businessesDiscovered: businesses.length,
    source: "mock_google_places",
  });

  const scores = scoreBusinesses(businesses, context, location);
  addLog(logs, "info", "Business fit scoring completed", {
    scoredBusinesses: scores.length,
    bestScore: scores[0]?.overallScore || 0,
  });

  const opportunities = generateOpportunities(businesses, scores, context, campaignBudget);
  const bestOpportunity = opportunities[0];
  if (!bestOpportunity) {
    throw new Error("No B2B opportunity could be generated from mock discovery.");
  }
  const bestBusiness = businesses.find((business) => business.id === bestOpportunity.businessId);
  if (!bestBusiness) {
    throw new Error("Best business was not found after opportunity generation.");
  }
  addLog(logs, "info", "Partnership opportunity generated", {
    businessId: bestBusiness.id,
    budget: bestOpportunity.proposedBudget,
    fanRewardBudget: bestOpportunity.fanRewardBudget,
    platformCommission: bestOpportunity.platformCommission,
  });

  const pitch = generateB2BPitch({
    business: bestBusiness,
    opportunity: bestOpportunity,
    context,
  });
  addLog(logs, "info", "Outreach pitch drafted", {
    pitchId: pitch.id,
    approvalRequired: pitch.approvalRequired,
  });

  const { payment, campaign } = simulateSmePayment(bestOpportunity, bestBusiness, campaignBudget);
  addLog(logs, "info", "SME payment simulated", {
    campaignBudget: payment.campaignBudget,
    fanRewardBudget: payment.fanRewardBudget,
    platformCommission: payment.platformCommission,
  });

  run.status = "completed";
  run.businessesDiscovered = businesses.length;
  run.opportunitiesGenerated = opportunities.length;
  run.revenuePotential = opportunities.reduce(
    (total, opportunity) => total + opportunity.platformCommission,
    0,
  );
  run.completedAt = new Date().toISOString();

  const current = getB2BAgentState();
  setB2BAgentState({
    businesses: mergeById(current.businesses, businesses),
    fitScores: mergeByBusinessId(current.fitScores, scores),
    opportunities: mergeById(current.opportunities, opportunities),
    outreachDrafts: mergeById(current.outreachDrafts, [pitch]),
    campaigns: mergeById(current.campaigns, [campaign]),
    runs: [run, ...current.runs].slice(0, 20),
    platformRevenue: current.platformRevenue + payment.platformCommission,
  });

  return {
    run,
    businesses,
    scores,
    bestOpportunity,
    pitch,
    campaignEconomics: payment,
    sponsoredCampaign: campaign,
  };
}

function addLog(
  logs: AgentLog[],
  level: AgentLog["level"],
  message: string,
  data?: AgentLog["data"],
) {
  logs.push({
    ts: new Date().toISOString(),
    level,
    message,
    data,
  });
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

function mergeByBusinessId<T extends { businessId: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.businessId, item]));
  for (const item of incoming) map.set(item.businessId, item);
  return Array.from(map.values());
}
