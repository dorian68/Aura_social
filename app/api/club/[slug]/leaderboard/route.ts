import { ok, fail } from "@/lib/apiResponse";
import { getCommunityBySlug, getLeaderboard } from "@/lib/superfan/db";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return fail("CLUB_NOT_FOUND", "Club not found.", 404);
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "alltime") as "alltime" | "monthly" | "weekly";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
  const board = getLeaderboard(community.id, period, limit);
  return ok({ leaderboard: board, period, communityId: community.id });
}
