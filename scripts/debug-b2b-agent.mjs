import { runB2BExpansionAgent } from "../lib/b2b-agent/orchestrator.ts";
import { calculateB2BPlatformRevenue, getB2BAgentState } from "../lib/b2b-agent/store.ts";

const beforeState = getB2BAgentState();
const beforeDerivedPlatformRevenue = calculateB2BPlatformRevenue(beforeState.campaigns);
assert(
  beforeState.platformRevenue === beforeDerivedPlatformRevenue,
  "B2B platformRevenue must be derived from existing campaign commissions before the run.",
);

const result = await runB2BExpansionAgent({
  location: "Fort-de-France",
  categories: ["restaurant", "bar", "concept_store", "beauty", "gym"],
  campaignBudget: 200,
});

const afterState = getB2BAgentState();
const afterDerivedPlatformRevenue = calculateB2BPlatformRevenue(afterState.campaigns);
const expectedAfterRevenue = roundCurrency(
  beforeDerivedPlatformRevenue + result.sponsoredCampaign.platformCommission,
);

assert(
  afterState.campaigns.some((campaign) => campaign.id === result.sponsoredCampaign.id),
  "B2B run must persist the sponsored campaign used for revenue.",
);
assert(
  result.bestOpportunity.status === "simulated_paid",
  "B2B run must mark the monetized best opportunity as simulated_paid.",
);
assert(
  afterState.platformRevenue === afterDerivedPlatformRevenue,
  "B2B platformRevenue must equal the derived campaign commission total after the run.",
);
assert(
  afterDerivedPlatformRevenue === expectedAfterRevenue,
  "B2B platformRevenue must increase only by the persisted campaign commission.",
);

const output = {
  script: "debug-b2b-agent",
  success: true,
  mockMode: true,
  externalCalls: 0,
  externalMessagesSent: 0,
  run: {
    id: result.run.id,
    status: result.run.status,
    location: result.run.location,
    businessesDiscovered: result.run.businessesDiscovered,
    opportunitiesGenerated: result.run.opportunitiesGenerated,
    revenuePotential: result.run.revenuePotential,
    logs: result.run.logs,
  },
  discoveredBusinesses: result.businesses.map((business) => ({
    id: business.id,
    name: business.name,
    category: business.category,
    city: business.city,
    rating: business.rating,
    reviewCount: business.reviewCount,
    source: business.source,
  })),
  fitScores: result.scores.map((score) => ({
    businessId: score.businessId,
    overallScore: score.overallScore,
    audienceLocationFit: score.audienceLocationFit,
    categoryFit: score.categoryFit,
    offerFit: score.offerFit,
    rationale: score.rationale,
  })),
  campaignBudget: result.campaignEconomics.campaignBudget,
  fanRewardBudget70Percent: result.campaignEconomics.fanRewardBudget,
  auraCommission30Percent: result.campaignEconomics.platformCommission,
  bestOpportunityStatus: result.bestOpportunity.status,
  platformRevenue: {
    source: "campaign_commissions",
    before: beforeDerivedPlatformRevenue,
    after: afterDerivedPlatformRevenue,
    addedCampaignCommission: result.sponsoredCampaign.platformCommission,
    campaignCount: afterState.campaigns.length,
  },
  pitchGenerated: {
    subject: result.pitch.subject,
    approvalRequired: result.pitch.approvalRequired,
    message: result.pitch.message,
  },
  simulatedSponsoredCampaign: result.sponsoredCampaign,
};

console.log(JSON.stringify(output, null, 2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
