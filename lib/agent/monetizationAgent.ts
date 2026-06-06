import { simulatePassLaunch } from "@/lib/loyalty/fanPassEngine";
import type { FanPass, LoyaltyProgramStats } from "@/lib/loyalty/types";

export function estimateFanPassOpportunity({
  stats,
  pass,
  followerCount,
}: {
  stats: LoyaltyProgramStats;
  pass: FanPass;
  followerCount: number;
}) {
  const strongFanCount = stats.tierCounts.Superfan + stats.tierCounts["Inner Circle"];
  const strongEngagementRate = followerCount > 0 ? (strongFanCount / followerCount) * 100 : 0;
  const simulation = simulatePassLaunch({
    followerCount,
    strongEngagementRate: Math.max(0.5, strongEngagementRate),
    expectedConversionRate: 0.5,
    passPrice: pass.price,
    supply: pass.supply,
  });

  return {
    strongFanCount,
    simulation,
    summary: `Estimated EUR ${simulation.estimatedRevenue} launch potential for ${simulation.estimatedPassHolders} ${pass.name} holders.`,
  };
}
