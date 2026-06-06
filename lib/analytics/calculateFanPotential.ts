import type {
  CreatorAnalysisInput,
  CreatorMetrics,
  CreatorScores,
  PostAnalysisResult,
  ScoreBreakdown,
  TokenReadinessBreakdown,
} from "@/lib/analytics/types";
import { clamp, round, safeDivide } from "@/lib/analytics/formatters";

const nicheReadiness = {
  Fitness: 90,
  Beauty: 85,
  Finance: 90,
  Food: 68,
  Lifestyle: 72,
  Gaming: 82,
  Education: 92,
  Music: 74,
  Other: 60,
} as const;

function weightedAverage(values: Array<[number, number]>) {
  return round(values.reduce((total, [value, weight]) => total + value * weight, 0));
}

export function calculateFanPotential(
  input: CreatorAnalysisInput,
  metrics: CreatorMetrics,
  postAnalysis: PostAnalysisResult,
): CreatorScores {
  const totalIntentComments = postAnalysis.totalHighIntentComments;
  const postCount = Math.max(input.posts.length, 1);

  // Each component is normalized to 100 before applying the product weights.
  const superfanBreakdown: ScoreBreakdown = {
    engagementRateScore: round(clamp((metrics.advancedEngagementRate / 6) * 100)),
    commentsQualityScore: round(
      clamp(safeDivide(metrics.commentToLikeRatio, 0.1) * 70 + safeDivide(totalIntentComments, postCount * 5) * 30),
    ),
    savesSharesScore: round(clamp(((metrics.saveRate + metrics.shareRate) / 1.5) * 100)),
    messageIntentScore: round(
      clamp(safeDivide(input.estimatedDMs ?? 0, Math.max(input.followers * 0.002, 1)) * 65 +
        safeDivide(totalIntentComments, postCount * 4) * 35),
    ),
    consistencyScore: postAnalysis.consistencyScore,
  };

  const superfanScore = weightedAverage([
    [superfanBreakdown.engagementRateScore, 0.3],
    [superfanBreakdown.commentsQualityScore, 0.2],
    [superfanBreakdown.savesSharesScore, 0.2],
    [superfanBreakdown.messageIntentScore, 0.15],
    [superfanBreakdown.consistencyScore, 0.15],
  ]);

  const audienceScore = round(clamp(((Math.log10(Math.max(input.followers, 1)) - 3) / 2) * 100));
  const intentScore = round(
    clamp(
      safeDivide(input.bioLinkClicks ?? 0, Math.max(input.followers * 0.005, 1)) * 45 +
        safeDivide(input.estimatedDMs ?? 0, Math.max(input.followers * 0.002, 1)) * 35 +
        safeDivide(totalIntentComments, postCount * 4) * 20,
    ),
  );
  const tokenReadinessBreakdown: TokenReadinessBreakdown = {
    audienceScore,
    engagementScore: round(clamp((metrics.advancedEngagementRate / 5) * 100)),
    superfanScore,
    nicheScore: nicheReadiness[input.niche],
    intentScore,
    consistencyScore: postAnalysis.consistencyScore,
  };

  const tokenReadinessScore = weightedAverage([
    [tokenReadinessBreakdown.audienceScore, 0.15],
    [tokenReadinessBreakdown.engagementScore, 0.25],
    [tokenReadinessBreakdown.superfanScore, 0.25],
    [tokenReadinessBreakdown.nicheScore, 0.1],
    [tokenReadinessBreakdown.intentScore, 0.15],
    [tokenReadinessBreakdown.consistencyScore, 0.1],
  ]);

  return { superfanScore, tokenReadinessScore, superfanBreakdown, tokenReadinessBreakdown };
}
