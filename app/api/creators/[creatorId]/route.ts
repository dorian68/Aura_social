import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { getCreator, updateCreator, getCommunitiesForCreator, getPlatformAccountsForCreator } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  try {
    const { creatorId } = await params;
    const creator = getCreator(creatorId);
    if (!creator) return fail("CREATOR_NOT_FOUND", `Creator ${creatorId} not found.`, 404);

    const communities = getCommunitiesForCreator(creatorId);
    const platforms = getPlatformAccountsForCreator(creatorId);

    return ok({ creator, communities, platforms });
  } catch (e) { return handleApiError(e, "GET_CREATOR_ERROR"); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  try {
    const { creatorId } = await params;
    if (!getCreator(creatorId)) return fail("CREATOR_NOT_FOUND", `Creator ${creatorId} not found.`, 404);

    const body = await readJsonBody(req);
    const creator = updateCreator(creatorId, body as Parameters<typeof updateCreator>[1]);
    return ok({ creator });
  } catch (e) { return handleApiError(e, "UPDATE_CREATOR_ERROR"); }
}
