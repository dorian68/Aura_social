import type {
  B2BContext,
  BusinessFitScore,
  LocalBusiness,
  PartnershipOpportunity,
} from "./types";

export function generatePartnershipOpportunity({
  business,
  score,
  context,
  proposedBudget = 200,
}: {
  business: LocalBusiness;
  score: BusinessFitScore;
  context: B2BContext;
  proposedBudget?: number;
}): PartnershipOpportunity {
  const platformCommissionRate = context.platformCommissionRate;
  const platformCommission = roundCurrency(proposedBudget * platformCommissionRate);
  const fanRewardBudget = roundCurrency(proposedBudget - platformCommission);
  const estimatedReach = Math.max(
    25,
    Math.round(context.activeFans * (score.audienceLocationFit / 100) * (score.overallScore / 100)),
  );
  const redemptionRate = score.overallScore >= 85 ? 0.18 : score.overallScore >= 75 ? 0.13 : 0.08;
  const estimatedRedemptions = Math.max(3, Math.round(estimatedReach * redemptionRate));
  const averageOrderValue = getAverageOrderValue(business);

  return {
    id: `opp_${business.id}_${Date.now()}`,
    creatorId: context.creator.id,
    businessId: business.id,
    title: `${business.name} x ${context.creator.name} sponsored loyalty activation`,
    objective: "Convert creator community engagement into measurable local business traffic.",
    proposedBudget,
    platformCommissionRate,
    platformCommission,
    fanRewardBudget,
    proposedOffer: buildProposedOffer(business),
    targetSegment: "Superfans, Inner Circle and near-Superfan local fans",
    estimatedReach,
    estimatedRedemptions,
    estimatedBusinessRevenue: roundCurrency(estimatedRedemptions * averageOrderValue),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

export function generateOpportunities(
  businesses: LocalBusiness[],
  scores: BusinessFitScore[],
  context: B2BContext,
  proposedBudget = 200,
) {
  return scores
    .map((score) => {
      const business = businesses.find((item) => item.id === score.businessId);
      if (!business) return null;
      return generatePartnershipOpportunity({
        business,
        score,
        context,
        proposedBudget,
      });
    })
    .filter((item): item is PartnershipOpportunity => Boolean(item))
    .sort((a, b) => b.estimatedBusinessRevenue - a.estimatedBusinessRevenue);
}

function buildProposedOffer(business: LocalBusiness) {
  if (business.category === "restaurant" || business.category === "bar") {
    return "15% off for top fans using a creator promo code during the campaign window.";
  }
  if (business.category === "fashion" || business.category === "concept_store") {
    return "Early-access shopping reward plus bonus loyalty points for in-store visits.";
  }
  if (business.category === "gym" || business.category === "beauty") {
    return "Trial session or service upgrade unlocked by loyalty points.";
  }
  if (business.category === "tourism" || business.category === "event_venue") {
    return "Limited experience access for Inner Circle fans with campaign tracking.";
  }
  return "Sponsored local reward distributed to high-intent fans.";
}

function getAverageOrderValue(business: LocalBusiness) {
  const byCategory: Record<LocalBusiness["category"], number> = {
    restaurant: 34,
    bar: 24,
    fashion: 45,
    beauty: 55,
    gym: 39,
    hotel: 120,
    tourism: 75,
    event_venue: 35,
    local_product: 28,
    concept_store: 42,
    culture: 30,
  };
  return byCategory[business.category] * (business.priceLevel >= 3 ? 1.15 : 1);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
