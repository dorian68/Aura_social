import type { AgentContext } from "./types";
import type { Reward } from "@/lib/loyalty/types";

export function recommendRewardAdjustments(context: AgentContext) {
  return context.rewards.map((reward) => {
    const eligibleFans = context.state.fans.filter(
      (fan) => fan.programId === context.program.id && fan.pointsBalance >= reward.costInPoints,
    );
    const eligibilityRate = context.stats.activeFans
      ? eligibleFans.length / context.stats.activeFans
      : 0;

    return {
      rewardId: reward.id,
      rewardName: reward.name,
      eligibilityRate,
      recommendation: buildRewardRecommendation(reward, eligibilityRate),
    };
  });
}

function buildRewardRecommendation(reward: Reward, eligibilityRate: number) {
  if (eligibilityRate < 0.08) {
    return `Lower ${reward.name} cost or create a smaller entry reward. Current eligibility is too narrow.`;
  }
  if (reward.stock !== null && reward.redeemedCount >= reward.stock * 0.8) {
    return `${reward.name} is close to stock pressure. Prepare a replacement or waitlist.`;
  }
  return `${reward.name} is priced reasonably for the current fan base.`;
}
