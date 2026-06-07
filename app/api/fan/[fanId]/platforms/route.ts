import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getFanById, getFanPlatformAccounts } from "@/lib/superfan/db";
import { listConfiguredPlatforms } from "@/lib/platforms/oauth";

export async function GET(_req: Request, { params }: { params: Promise<{ fanId: string }> }) {
  try {
    const { fanId } = await params;
    if (!getFanById(fanId)) return fail("FAN_NOT_FOUND", `Fan ${fanId} not found.`, 404);

    const accounts = getFanPlatformAccounts(fanId);
    const configured = listConfiguredPlatforms();

    return ok({
      accounts,
      configured,
      connected: accounts.filter(a => a.connectedStatus === "connected").map(a => a.platform),
    });
  } catch (e) { return handleApiError(e, "FAN_PLATFORMS_ERROR"); }
}
