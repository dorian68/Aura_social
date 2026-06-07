import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getPlatformAccountsForCreator, getCreator } from "@/lib/superfan/db";
import { listConfiguredPlatforms } from "@/lib/platforms/oauth";

export async function GET(_req: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  try {
    const { creatorId } = await params;
    if (!getCreator(creatorId)) return fail("CREATOR_NOT_FOUND", `Creator ${creatorId} not found.`, 404);

    const accounts = getPlatformAccountsForCreator(creatorId);
    const configuredPlatforms = listConfiguredPlatforms();

    return ok({
      accounts,
      configured: configuredPlatforms,
      summary: {
        total: accounts.length,
        connected: accounts.filter(a => a.connectedStatus === "connected").length,
        platforms: accounts.map(a => a.platform),
      },
    });
  } catch (e) { return handleApiError(e, "PLATFORMS_LIST_ERROR"); }
}
