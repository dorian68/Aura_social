import { ok, fail } from "@/lib/apiResponse";
import { getCommunityBySlug } from "@/lib/superfan/db";
import { getChallengesForCommunity, getRewardsForCommunity, getLeaderboard, getCommunityStats } from "@/lib/superfan/db";
import { getCreator } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return fail("CLUB_NOT_FOUND", "Club not found.", 404);
  if (!community.isPublic) return fail("CLUB_PRIVATE", "This club is invite-only.", 403);
  const creator = getCreator(community.creatorId);
  const challenges = getChallengesForCommunity(community.id, "active");
  const rewards = getRewardsForCommunity(community.id, "active");
  const leaderboard = getLeaderboard(community.id, "alltime", 10);
  const stats = getCommunityStats(community.id);
  return ok({
    community: {
      id: community.id, slug: community.slug, name: community.name,
      description: community.description, coverImageUrl: community.coverImageUrl,
      brandColor: community.brandColor,
    },
    creator: creator ? { displayName: creator.displayName, avatarUrl: creator.avatarUrl, city: creator.city, niche: creator.niche } : null,
    leaderboard,
    challenges: challenges.map(c => ({ id: c.id, title: c.title, description: c.description, pointsReward: c.pointsReward, type: c.type, verificationMethod: c.verificationMethod, completionCount: c.completionCount, expiresAt: c.expiresAt })),
    rewards: rewards.map(r => ({ id: r.id, title: r.title, description: r.description, imageUrl: r.imageUrl, pointsCost: r.pointsCost, type: r.type, stock: r.stock, redeemed: r.redeemed, expiresAt: r.expiresAt })),
    stats: { totalFans: stats.totalFans, activeThisWeek: stats.activeThisWeek },
  });
}
