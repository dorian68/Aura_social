import { ok, handleApiError } from "@/lib/apiResponse";
import { getQRStatsForCampaign } from "@/lib/superfan/db";

export async function GET(_req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await params;
    return ok(getQRStatsForCampaign(campaignId));
  } catch (e) { return handleApiError(e, "QR_STATS_ERROR"); }
}
