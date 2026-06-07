import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getCommunityStats, getLeaderboard, getChallengesForCommunity, getCampaignsForCommunity, getQRStatsForCampaign } from "@/lib/superfan/db";
import { getPlatformAccountsForCreator } from "@/lib/superfan/db";

export async function GET(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const stats = getCommunityStats(communityId);
    const topFans = getLeaderboard(communityId, "alltime", 5);
    const challenges = getChallengesForCommunity(communityId, "active");
    const campaigns = getCampaignsForCommunity(communityId);
    const platforms = getPlatformAccountsForCreator(community.creatorId);

    // Campaign attribution
    let totalQRScans = 0; let totalUniqueScans = 0;
    for (const campaign of campaigns) {
      const qs = getQRStatsForCampaign(campaign.id);
      totalQRScans += qs.scans; totalUniqueScans += qs.uniqueScans;
    }

    // Engagement rate estimate
    const engagementRate = stats.totalFans > 0 ? Math.round((stats.activeThisWeek / stats.totalFans) * 100) : 0;
    const projectedScans = Math.round(stats.activeThisWeek * 0.4); // 40% of active fans

    const report = {
      generatedAt: new Date().toISOString(),
      community: { name: community.name, slug: community.slug, brandColor: community.brandColor },
      platforms: platforms.map(p => ({ platform: p.platform, handle: p.handle, followersCount: p.followersCount, status: p.connectedStatus })),
      community_metrics: {
        totalFans: stats.totalFans, activeThisWeek: stats.activeThisWeek,
        engagementRate: `${engagementRate}%`, tiers: stats.tiers,
        totalPointsAwarded: stats.totalPointsAwarded,
      },
      activity: {
        activeChallenges: challenges.length,
        totalCampaignCommission: stats.totalCampaignCommission,
        partnerCampaigns: campaigns.length,
        totalQRScans, totalUniqueScans,
      },
      top_fans: topFans,
      pitch: {
        headline: `${community.name} — Sponsor Campaign Opportunity`,
        hook: `${stats.totalFans} registered superfans, ${engagementRate}% active weekly.`,
        value_prop: `Access to ${stats.totalFans} pre-qualified fans who have opted into a loyalty community. Previous campaigns generated ${totalQRScans} tracked visits.`,
        projected_reach: projectedScans,
        commission_note: "10–15% platform commission on campaign budget.",
      },
    };

    return ok({ report });
  } catch (e) { return handleApiError(e, "REPORT_ERROR"); }
}
