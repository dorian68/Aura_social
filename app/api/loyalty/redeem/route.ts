import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { redeemPoints } from "@/lib/loyalty/loyaltyEngine";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { validateAmount, GuardrailError } from "@/lib/agentGuardrails";
import type { RedeemPointsInput } from "@/lib/loyalty/types";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as Partial<RedeemPointsInput>;
    if (!body.programId || !body.fanId) {
      return fail("LOYALTY_REDEEM_INVALID", "programId and fanId are required.", 400);
    }
    let points: number;
    try {
      points = validateAmount(body.points, "points", { min: 1 });
    } catch (e) {
      const err = e as GuardrailError;
      return fail(err.code || "LOYALTY_REDEEM_INVALID", err.message, 400);
    }

    const next = redeemPoints(getLoyaltyState(), { ...body, points } as RedeemPointsInput);
    setLoyaltyState(next);
    const fan = next.fans.find((item) => item.id === body.fanId);
    const transaction = next.transactions.at(-1);

    return ok({ fan, transaction });
  } catch (error) {
    return handleApiError(error, "LOYALTY_REDEEM_FAILED");
  }
}
