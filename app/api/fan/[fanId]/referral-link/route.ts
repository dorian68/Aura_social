import { ok, fail } from "@/lib/apiResponse";
import { getMembership, getCommunityById } from "@/lib/superfan/db";

export async function GET(req: Request, { params }: { params: Promise<{ fanId: string }> }) {
  const { fanId } = await params;
  const url = new URL(req.url);
  const communityId = url.searchParams.get("communityId");
  if (!communityId) return fail("MISSING_COMMUNITY", "communityId query param required.", 400);
  const membership = getMembership(communityId, fanId);
  if (!membership) return fail("NOT_A_MEMBER", "Fan is not a member of this community.", 404);
  const community = getCommunityById(communityId);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3009";
  const link = `${base}/club/${community?.slug ?? communityId}/join?ref=${membership.referralCode}`;
  return ok({ referralCode: membership.referralCode, referralLink: link });
}
