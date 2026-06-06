import type { AgentContext } from "./types";

export function summarizeLoyaltyInsights(context: AgentContext) {
  const nearSuperfan = context.fanSegments.find((segment) => segment.name === "Near Superfan");
  const innerCircleCount = context.stats.tierCounts["Inner Circle"];
  const redemptionPressure = context.tokenEconomy.redemptionPressure;

  return {
    activeFans: context.stats.activeFans,
    topTierFans: innerCircleCount,
    nearSuperfanCount: nearSuperfan?.fanCount || 0,
    redemptionPressure,
    summary:
      innerCircleCount > 0
        ? "The program already has premium fans. Prioritize VIP access and direct outreach."
        : "The program needs more tier movement before premium automation.",
  };
}
