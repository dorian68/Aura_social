import { ok, fail } from "@/lib/apiResponse";
import { getTransactions } from "@/lib/superfan/db";

export async function GET(req: Request, { params }: { params: Promise<{ fanId: string }> }) {
  const { fanId } = await params;
  const url = new URL(req.url);
  const communityId = url.searchParams.get("communityId");
  if (!communityId) return fail("MISSING_COMMUNITY", "communityId query param required.", 400);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const transactions = getTransactions(fanId, communityId, limit, (page - 1) * limit);
  return ok({ transactions, page, limit });
}
