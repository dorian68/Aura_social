import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getFanById, getMembershipsByFan, getCommunityById, getLeaderEntry, getLedger, getTransactions } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ fanId: string }> }) {
  try {
    const { fanId } = await params;
    const fan = getFanById(fanId);
    if (!fan) return fail("FAN_NOT_FOUND", `Fan ${fanId} not found.`, 404);

    const memberships = getMembershipsByFan(fanId);
    const communities = memberships.map((m) => {
      const community = getCommunityById(m.communityId);
      const leaderEntry = getLeaderEntry(fanId, m.communityId);
      const ledger = getLedger(fanId, m.communityId);
      const recentTx = getTransactions(fanId, m.communityId, 5, 0);
      return {
        community: community ? {
          id: community.id,
          name: community.name,
          slug: community.slug,
          brandColor: community.brandColor,
        } : null,
        membership: {
          communityId: m.communityId,
          tier: m.tier,
          referralCode: m.referralCode,
          joinedAt: m.joinedAt,
          lastActiveAt: m.lastActiveAt,
        },
        ledger: {
          balance: ledger.balance,
          totalEarned: ledger.totalEarned,
          totalSpent: ledger.totalSpent,
          tier: leaderEntry?.tier ?? m.tier,
          rank: leaderEntry?.rank ?? null,
        },
        recentTransactions: recentTx,
      };
    });

    return ok({
      fan: {
        id: fan.id,
        displayName: fan.displayName,
        email: fan.email,
        city: fan.city,
        createdAt: fan.createdAt,
      },
      communities,
      totalCommunities: communities.length,
    });
  } catch (e) { return handleApiError(e, "FAN_PROFILE_ERROR"); }
}
