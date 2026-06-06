import type { CampaignDraft, FanProfile, Reward } from "@/lib/loyalty/types";

export function generateTopFanDM({
  creatorName,
  fan,
  passName,
}: {
  creatorName: string;
  fan: FanProfile;
  passName: string;
}): CampaignDraft {
  return {
    channel: "instagram_dm",
    audience: "top_fans",
    message: `Hey ${fan.displayName}, I noticed you are one of the most active people in the community. I am opening early access to ${passName} and wanted you to see it first.`,
    cta: `Reply "VIP" if you want early access from ${creatorName}.`,
    approvalRequired: true,
  };
}

export function generateRewardReminderDM({
  fan,
  reward,
}: {
  fan: FanProfile;
  reward: Reward;
}): CampaignDraft {
  const missing = Math.max(0, reward.costInPoints - fan.pointsBalance);
  return {
    channel: "instagram_dm",
    audience: "near_reward_unlock",
    message:
      missing > 0
        ? `Hey ${fan.displayName}, you are only ${missing} points away from unlocking ${reward.name}. I am running a points challenge this week if you want to close the gap.`
        : `Hey ${fan.displayName}, you have enough points to unlock ${reward.name}. I kept this reward aside for active members like you.`,
    cta: "Open your rewards hub and claim it when you are ready.",
    approvalRequired: true,
  };
}

export function generateVIPPassLaunchDM(passName: string, price: number): CampaignDraft {
  return {
    channel: "instagram_dm",
    audience: "superfans",
    message: `I am opening a limited ${passName} for the most active members of the community. It includes private access, priority rewards, and early drops. Founder price is EUR ${price}.`,
    cta: "Reply if you want the first access link.",
    approvalRequired: true,
  };
}
