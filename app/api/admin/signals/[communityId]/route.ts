import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getSignalsForCommunity, getSignalStats } from "@/lib/superfan/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("NOT_FOUND", "Community not found", 404);

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const signals = getSignalsForCommunity(communityId, limit, offset);
    const stats = getSignalStats(communityId);

    return ok({ signals, stats, total: stats.total });
  } catch (e) { return handleApiError(e); }
}
