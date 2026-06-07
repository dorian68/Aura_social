import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getFansInCommunity } from "@/lib/superfan/db";

export async function GET(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    const fans = getFansInCommunity(communityId, limit, (page - 1) * limit);
    return ok({
      fans: fans.map(f => ({
        id: f.id, email: f.email, displayName: f.displayName ?? f.email.split("@")[0],
        city: f.city, tier: f.membership.tier, referralCode: f.membership.referralCode,
        points: f.ledger.totalEarned, balance: f.ledger.balance, joinedAt: f.membership.joinedAt, lastActiveAt: f.membership.lastActiveAt,
      })),
      page, limit,
    });
  } catch (e) { return handleApiError(e, "FANS_ERROR"); }
}
