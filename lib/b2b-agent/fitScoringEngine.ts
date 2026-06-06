import type { B2BContext, BusinessFitScore, LocalBusiness } from "./types";

const categoryAffinity: Record<string, string[]> = {
  "Creator education and community": ["concept_store", "event_venue", "restaurant", "tourism"],
  music: ["bar", "event_venue", "restaurant", "fashion"],
  fitness: ["gym", "beauty", "local_product"],
  fashion: ["fashion", "beauty", "concept_store"],
  food: ["restaurant", "bar", "tourism"],
  travel: ["hotel", "tourism", "restaurant", "local_product"],
};

export function scoreBusinessFit(
  business: LocalBusiness,
  context: B2BContext,
  location = business.city,
): BusinessFitScore {
  const audienceLocationFit = scoreLocationFit(business, context.creator.region, location);
  const categoryFit = scoreCategoryFit(business.category, context.creator.category);
  const offerFit = scoreOfferFit(business);
  const budgetFit = scoreBudgetFit(business, context.loyaltyStats.activeFans);
  const proximityScore = scoreProximity(business.city, location);
  const culturalFit = scoreCulturalFit(business, context.creator.region);
  const overallScore = Math.round(
    audienceLocationFit * 0.24 +
      categoryFit * 0.22 +
      offerFit * 0.18 +
      budgetFit * 0.14 +
      proximityScore * 0.12 +
      culturalFit * 0.1,
  );

  return {
    businessId: business.id,
    creatorId: context.creator.id,
    audienceLocationFit,
    categoryFit,
    offerFit,
    budgetFit,
    proximityScore,
    culturalFit,
    overallScore,
    rationale: buildRationale({
      business,
      audienceLocationFit,
      categoryFit,
      offerFit,
      budgetFit,
      proximityScore,
      culturalFit,
      overallScore,
    }),
  };
}

export function scoreBusinesses(
  businesses: LocalBusiness[],
  context: B2BContext,
  location: string,
) {
  return businesses
    .map((business) => scoreBusinessFit(business, context, location))
    .sort((a, b) => b.overallScore - a.overallScore);
}

function scoreLocationFit(business: LocalBusiness, creatorRegion: string, location: string) {
  if (sameNormalized(business.city, location)) return 94;
  if (creatorRegion.toLowerCase().includes(business.region.toLowerCase())) return 82;
  if (business.country === "France") return 68;
  return 45;
}

function scoreCategoryFit(category: LocalBusiness["category"], creatorCategory: string) {
  const affinities = categoryAffinity[creatorCategory] || categoryAffinity["Creator education and community"];
  if (affinities.includes(category)) return 88;
  if (["restaurant", "bar", "event_venue", "concept_store"].includes(category)) return 76;
  return 62;
}

function scoreOfferFit(business: LocalBusiness) {
  let score = 60;
  if (business.rating >= 4.6) score += 15;
  if (business.reviewCount >= 150) score += 10;
  if (business.instagramHandle) score += 8;
  if (["restaurant", "bar", "fashion", "tourism", "event_venue"].includes(business.category)) score += 7;
  return Math.min(100, score);
}

function scoreBudgetFit(business: LocalBusiness, activeFans: number) {
  const base = business.priceLevel >= 3 ? 82 : 74;
  const audienceBonus = activeFans >= 100 ? 10 : activeFans >= 25 ? 5 : 0;
  return Math.min(100, base + audienceBonus);
}

function scoreProximity(city: string, location: string) {
  return sameNormalized(city, location) ? 95 : 68;
}

function scoreCulturalFit(business: LocalBusiness, creatorRegion: string) {
  const localCategoryBonus = ["culture", "event_venue", "local_product", "concept_store"].includes(
    business.category,
  )
    ? 10
    : 0;
  const localRegionBonus = creatorRegion.toLowerCase().includes(business.region.toLowerCase()) ? 10 : 0;
  return Math.min(100, 72 + localCategoryBonus + localRegionBonus);
}

function buildRationale(input: {
  business: LocalBusiness;
  audienceLocationFit: number;
  categoryFit: number;
  offerFit: number;
  budgetFit: number;
  proximityScore: number;
  culturalFit: number;
  overallScore: number;
}) {
  const rationale = [
    `${input.business.name} is a ${input.business.category.replace("_", " ")} in ${input.business.city}.`,
    `Audience-location fit: ${input.audienceLocationFit}/100.`,
    `Category fit: ${input.categoryFit}/100 for a loyalty-funded local offer.`,
    `Offer fit is supported by rating ${input.business.rating} and ${input.business.reviewCount} reviews.`,
  ];

  if (input.overallScore >= 85) {
    rationale.push("Overall fit is strong enough for a sponsored rewards campaign.");
  } else if (input.overallScore >= 70) {
    rationale.push("Overall fit is viable for a small paid pilot.");
  } else {
    rationale.push("Overall fit is exploratory; keep the pitch low-risk.");
  }

  return rationale;
}

function sameNormalized(left: string, right: string) {
  return normalize(left) === normalize(right);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
