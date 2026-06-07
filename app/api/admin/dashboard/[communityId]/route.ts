import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getCommunityStats, getFansInCommunity, getChallengesForCommunity, getRewardsForCommunity, getPendingCompletions, getPendingRedemptions, getCampaignsForCommunity } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const stats = getCommunityStats(communityId);
    const topFans = getFansInCommunity(communityId, 10, 0);
    const challenges = getChallengesForCommunity(communityId);
    const rewards = getRewardsForCommunity(communityId);
    const pendingCompletions = getPendingCompletions(communityId);
    const pendingRedemptions = getPendingRedemptions(communityId);
    const campaigns = getCampaignsForCommunity(communityId);
    return ok({
      community, stats,
      topFans: topFans.map(f => ({ id: f.id, displayName: f.displayName ?? f.email.split("@")[0], email: f.email, tier: f.membership.tier, points: f.ledger.totalEarned, balance: f.ledger.balance, joinedAt: f.membership.joinedAt, lastActiveAt: f.membership.lastActiveAt })),
      challenges: challenges.map(c => ({ id: c.id, title: c.title, status: c.status, pointsReward: c.pointsReward, completionCount: c.completionCount })),
      rewards: rewards.map(r => ({ id: r.id, title: r.title, status: r.status, pointsCost: r.pointsCost, redeemed: r.redeemed, stock: r.stock })),
      pendingCompletionsCount: pendingCompletions.length,
      pendingRedemptionsCount: pendingRedemptions.length,
      campaigns: campaigns.length,
      totalCampaignCommission: stats.totalCampaignCommission,
    });
  } catch (e) { return handleApiError(e, "DASHBOARD_ERROR"); }
}
