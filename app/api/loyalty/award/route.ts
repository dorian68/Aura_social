import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { awardPoints } from "@/lib/loyalty/loyaltyEngine";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import type { AwardPointsInput } from "@/lib/loyalty/types";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as Partial<AwardPointsInput>;
    if (!body.programId || !body.fanId || !body.actionType) {
      return fail("LOYALTY_AWARD_INVALID", "programId, fanId and actionType are required.", 400);
    }

    const next = awardPoints(getLoyaltyState(), body as AwardPointsInput);
    setLoyaltyState(next);
    const fan = next.fans.find((item) => item.id === body.fanId);
    const transaction = next.transactions.at(-1);

    return ok({ fan, transaction });
  } catch (error) {
    return handleApiError(error, "LOYALTY_AWARD_FAILED");
  }
}
