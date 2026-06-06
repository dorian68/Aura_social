import { analyzePosts } from "@/lib/analytics/analyzePosts";
import { calculateEngagement } from "@/lib/analytics/calculateEngagement";
import { calculateFanPotential } from "@/lib/analytics/calculateFanPotential";
import { calculateRevenuePotential } from "@/lib/analytics/calculateRevenuePotential";
import { generateRecommendations } from "@/lib/analytics/generateRecommendations";
import type { CreatorAnalysisInput, CreatorAnalysisReport } from "@/lib/analytics/types";

function describeBand(score: number, labels: [string, string, string]) {
  if (score < 40) return labels[0];
  if (score < 70) return labels[1];
  return labels[2];
}

export function runCreatorAnalysis(input: CreatorAnalysisInput, source = "instagram-provider"): CreatorAnalysisReport {
  const metrics = calculateEngagement(input);
  const postAnalysis = analyzePosts(input.posts, input.followers);
  const scores = calculateFanPotential(input, metrics, postAnalysis);
  const revenue = calculateRevenuePotential(input, metrics.engagementRate, scores.tokenReadinessScore);
  const recommendations = generateRecommendations(input, metrics, scores, postAnalysis);

  return {
    profile: {
      username: input.username,
      followers: input.followers,
      postsAnalyzed: input.postsAnalyzed,
      niche: input.niche,
      goal: input.goal,
    },
    metrics,
    scores,
    revenue,
    postAnalysis,
    recommendations,
    diagnostics: {
      engagementQuality: describeBand(scores.superfanBreakdown.engagementRateScore, [
        "Engagement faible : votre audience reste majoritairement passive.",
        "Engagement solide : votre communauté répond à vos contenus.",
        "Engagement fort : votre audience est activable rapidement.",
      ]),
      superfanIntensity: describeBand(scores.superfanScore, [
        "Noyau de Super-Fans encore limité.",
        "Noyau de fans actifs en formation.",
        "Super-Fans identifiables et mobilisables.",
      ]),
      tokenMaturity: describeBand(scores.tokenReadinessScore, [
        "Maturité insuffisante pour un lancement immédiat.",
        "Programme pilote recommandé avant généralisation.",
        "Communauté prête pour préparer un lancement structuré.",
      ]),
      monetizationPotential: describeBand(
        revenue.realistic.annualRevenue < 5_000 ? 25 : revenue.realistic.annualRevenue < 20_000 ? 55 : 85,
        [
          "Potentiel initial : privilégiez une offre simple et ciblée.",
          "Potentiel significatif : testez une offre premium avec waitlist.",
          "Potentiel élevé : segmentez vos offres et vos avantages.",
        ],
      ),
    },
    meta: {
      analyzedAt: new Date().toISOString(),
      source,
      version: "1.0.0",
    },
  };
}
