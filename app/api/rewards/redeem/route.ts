import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { checkRewardEligibility, redeemReward } from "@/lib/loyalty/rewardEngine";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as {
      programId?: string;
      fanId?: string;
      rewardId?: string;
      simulateOnly?: boolean;
    };
    if (!body.programId || !body.fanId || !body.rewardId) {
      return fail("REWARD_REDEEM_INVALID", "programId, fanId and rewardId are required.", 400);
    }

    const state = getLoyaltyState();
    if (body.simulateOnly) {
      return ok({
        eligibility: checkRewardEligibility(state, body.programId, body.fanId, body.rewardId),
      });
    }

    const result = redeemReward(state, {
      programId: body.programId,
      fanId: body.fanId,
      rewardId: body.rewardId,
    });
    setLoyaltyState(result.state);

    return ok({
      eligibility: result.eligibility,
      reward: result.reward,
    });
  } catch (error) {
    return handleApiError(error, "REWARD_REDEEM_FAILED");
  }
}
