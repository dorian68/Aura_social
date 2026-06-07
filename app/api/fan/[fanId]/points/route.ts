import { ok, fail } from "@/lib/apiResponse";
import { getLedger, getFanRank } from "@/lib/superfan/db";

export async function GET(req: Request, { params }: { params: Promise<{ fanId: string }> }) {
  const { fanId } = await params;
  const url = new URL(req.url);
  const communityId = url.searchParams.get("communityId");
  if (!communityId) return fail("MISSING_COMMUNITY", "communityId query param required.", 400);
  const ledger = getLedger(fanId, communityId);
  const rank = getFanRank(communityId, fanId);
  return ok({ ledger, rank });
}
