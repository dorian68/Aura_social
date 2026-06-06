import type { LocalBusiness, PartnershipOpportunity, PaymentSimulation, SponsoredRewardCampaign } from "./types";

export function simulateSmePayment(
  opportunity: PartnershipOpportunity,
  business: LocalBusiness,
  campaignBudget = opportunity.proposedBudget,
) {
  const platformCommissionRate = opportunity.platformCommissionRate;
  const platformCommission = roundCurrency(campaignBudget * platformCommissionRate);
  const fanRewardBudget = roundCurrency(campaignBudget - platformCommission);
  const payment: PaymentSimulation = {
    opportunityId: opportunity.id,
    campaignBudget,
    fanRewardBudget,
    platformCommission,
    platformCommissionRate,
    paymentStatus: "simulated_paid",
    platformRevenue: platformCommission,
    message:
      "Payment simulation only. No Stripe charge, bank movement, invoice, or real business contact occurred.",
  };

  const start = new Date();
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const campaign: SponsoredRewardCampaign = {
    id: `campaign_${business.id}_${Date.now()}`,
    partnershipOpportunityId: opportunity.id,
    creatorId: opportunity.creatorId,
    businessId: business.id,
    name: `${business.name} sponsored rewards pilot`,
    budget: campaignBudget,
    fanRewardBudget,
    platformCommission,
    rewardType: "local_offer",
    promoCode: buildPromoCode(business.name),
    pointsBonus: Math.max(100, Math.round(fanRewardBudget)),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    status: "payment_simulated",
    performance: {
      estimatedReach: opportunity.estimatedReach,
      estimatedRedemptions: opportunity.estimatedRedemptions,
      estimatedBusinessRevenue: opportunity.estimatedBusinessRevenue,
      platformRevenue: platformCommission,
    },
  };

  return {
    payment,
    campaign,
  };
}

function buildPromoCode(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
  return `AURA-${prefix || "LOCAL"}-15`;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
