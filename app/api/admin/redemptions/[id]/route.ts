import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getPendingRedemptions } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: communityId } = await params;
    if (!getCommunityById(communityId)) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const redemptions = getPendingRedemptions(communityId);
    return ok({ redemptions });
  } catch (e) { return handleApiError(e, "REDEMPTIONS_LIST_ERROR"); }
}
