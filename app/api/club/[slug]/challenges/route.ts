import { ok, fail } from "@/lib/apiResponse";
import { getCommunityBySlug, getChallengesForCommunity } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return fail("CLUB_NOT_FOUND", "Club not found.", 404);
  const challenges = getChallengesForCommunity(community.id, "active");
  return ok({ challenges });
}
