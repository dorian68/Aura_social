import { runB2BExpansionAgent } from "../lib/b2b-agent/orchestrator.ts";

const result = runB2BExpansionAgent({
  location: "Fort-de-France",
  categories: ["restaurant", "bar", "concept_store", "beauty", "gym"],
  campaignBudget: 200,
});

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
  pitchGenerated: {
    subject: result.pitch.subject,
    approvalRequired: result.pitch.approvalRequired,
    message: result.pitch.message,
  },
  simulatedSponsoredCampaign: result.sponsoredCampaign,
};

console.log(JSON.stringify(output, null, 2));
