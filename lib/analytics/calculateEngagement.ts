import type { CreatorAnalysisInput, CreatorMetrics } from "@/lib/analytics/types";
import { round, safeDivide } from "@/lib/analytics/formatters";

export function calculateEngagement(input: CreatorAnalysisInput): CreatorMetrics {
  const saves = input.averageSaves ?? 0;
  const shares = input.averageShares ?? 0;

  return {
    engagementRate: round(safeDivide(input.averageLikes + input.averageComments, input.followers) * 100),
    advancedEngagementRate: round(
      safeDivide(input.averageLikes + input.averageComments + saves + shares, input.followers) * 100,
    ),
    commentToLikeRatio: round(safeDivide(input.averageComments, input.averageLikes), 4),
    saveRate: round(safeDivide(saves, input.followers) * 100),
    shareRate: round(safeDivide(shares, input.followers) * 100),
    reelViewRate: round(safeDivide(input.averageReelViews ?? 0, input.followers) * 100),
    bioLinkClickRate: round(safeDivide(input.bioLinkClicks ?? 0, input.followers) * 100),
  };
}
