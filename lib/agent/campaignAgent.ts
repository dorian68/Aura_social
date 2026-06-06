import type { Campaign, CampaignDraft } from "@/lib/loyalty/types";

export function generateInstagramAnnouncement({
  programName,
  pointsName,
}: {
  programName: string;
  pointsName: string;
}): CampaignDraft {
  return {
    channel: "instagram_post",
    audience: "all_followers",
    message: `I am launching ${programName}: a simple way to earn ${pointsName} for supporting, sharing, commenting, attending events, and unlocking rewards.`,
    cta: "Join the loyalty hub and start earning points.",
    approvalRequired: true,
  };
}

export function generateStorySequence(programName: string): CampaignDraft[] {
  return [
    {
      channel: "instagram_story",
      audience: "all_followers",
      message: `${programName} opens this week. Your comments, saves, shares, and referrals will now count toward real rewards.`,
      cta: "Tap to join the waitlist.",
      approvalRequired: true,
    },
    {
      channel: "instagram_story",
      audience: "active_fans",
      message: "Top fans will get early access to passes, private content, and limited rewards.",
      cta: "Reply with your favorite reward idea.",
      approvalRequired: true,
    },
  ];
}

export function generateDoublePointsCampaign(programId: string): Campaign {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 48 * 60 * 60 * 1000);
  return {
    id: `campaign_double_points_${Date.now()}`,
    programId,
    name: "Double Points Weekend",
    objective: "Move near-superfans into the Superfan tier with a focused engagement challenge.",
    channel: "instagram_story",
    targetSegment: "near_superfan",
    message: "For 48 hours, comments and shares count double toward your next reward.",
    status: "draft",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    performance: {
      estimatedReach: 2500,
      estimatedConversions: 35,
      estimatedRevenue: 0,
    },
    createdAt: new Date().toISOString(),
  };
}

export function generatePartnerOfferMessage(partnerName = "a local partner"): CampaignDraft {
  return {
    channel: "instagram_dm",
    audience: "inner_circle",
    message: `I am testing a limited partner reward with ${partnerName}. Inner Circle members will get first access before it goes public.`,
    cta: "Approve this partner offer before sending.",
    approvalRequired: true,
  };
}
