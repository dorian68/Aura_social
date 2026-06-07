import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getCommunityAnalytics, getCommunityStats, getPlatformAccountsForCreator, getCreator } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);

    const analytics = getCommunityAnalytics(communityId);
    const stats = getCommunityStats(communityId);
    const creator = getCreator(community.creatorId);
    const creatorPlatforms = getPlatformAccountsForCreator(community.creatorId);

    const totalCreatorFollowers = creatorPlatforms
      .filter(p => p.connectedStatus === "connected" && p.followersCount)
      .reduce((s, p) => s + (p.followersCount ?? 0), 0);

    return ok({
      community: { id: community.id, name: community.name, slug: community.slug },
      creator: creator ? { displayName: creator.displayName, niche: creator.niche } : null,
      creatorPlatforms: creatorPlatforms.map(p => ({
        platform: p.platform, handle: p.handle, followersCount: p.followersCount, connectedStatus: p.connectedStatus,
      })),
      totalCreatorFollowers,
      fanStats: {
        total: stats.totalFans,
        activeThisWeek: stats.activeThisWeek,
        tiers: stats.tiers,
        connectedToAnyPlatform: analytics.connectedFans,
        connectionRate: stats.totalFans > 0 ? Math.round((analytics.connectedFans / stats.totalFans) * 100) : 0,
      },
      reach: {
        totalFanFollowers: analytics.totalReach,
        byPlatform: analytics.platformDistribution,
      },
      engagement: {
        totalPointsAwarded: stats.totalPointsAwarded,
        bySource: analytics.pointsBySource,
      },
      growth: {
        newFansByWeek: analytics.newFansByWeek,
      },
    });
  } catch (e) { return handleApiError(e, "ANALYTICS_ERROR"); }
}
