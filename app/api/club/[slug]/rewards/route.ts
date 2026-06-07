import { ok, fail } from "@/lib/apiResponse";
import { getCommunityBySlug, getRewardsForCommunity } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return fail("CLUB_NOT_FOUND", "Club not found.", 404);
  const rewards = getRewardsForCommunity(community.id, "active");
  return ok({ rewards });
}
