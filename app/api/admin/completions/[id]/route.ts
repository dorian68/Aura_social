import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCommunityById, getPendingCompletions } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: communityId } = await params;
    if (!getCommunityById(communityId)) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const completions = getPendingCompletions(communityId);
    return ok({ completions });
  } catch (e) { return handleApiError(e, "COMPLETIONS_LIST_ERROR"); }
}
