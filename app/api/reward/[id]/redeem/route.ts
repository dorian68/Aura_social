import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { redeemReward, getLedger } from "@/lib/superfan/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);
    const { fanId, communityId } = body as Record<string, string>;
    if (!fanId || !communityId) throw new DomainError("MISSING_PARAMS", "fanId and communityId are required.", 400);

    const redemption = redeemReward(id, fanId, communityId);
    const ledger = getLedger(fanId, communityId);

    return ok({ redemption, newBalance: ledger.balance });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.startsWith("INSUFFICIENT_POINTS:")) {
        const [, bal, req2] = e.message.split(":");
        return fail("INSUFFICIENT_POINTS", `You need ${Number(req2) - Number(bal)} more points for this reward.`, 400, { balance: Number(bal), required: Number(req2) });
      }
      if (e.message === "REWARD_OUT_OF_STOCK") return fail("REWARD_OUT_OF_STOCK", "This reward is currently out of stock.", 400);
      if (e.message === "REWARD_UNAVAILABLE") return fail("REWARD_UNAVAILABLE", "This reward is not available.", 400);
    }
    return handleApiError(e, "REDEEM_ERROR");
  }
}
