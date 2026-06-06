import type { NextRequest } from "next/server";
import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { createReward } from "@/lib/loyalty/rewardEngine";
import { getDemoProgramId, getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { validateAmount, GuardrailError } from "@/lib/agentGuardrails";
import type { RewardType } from "@/lib/loyalty/types";

export async function GET(request: NextRequest) {
  const state = getLoyaltyState();
  const programId = request.nextUrl.searchParams.get("programId") || getDemoProgramId();
  return ok({
    rewards: state.rewards.filter((reward) => reward.programId === programId),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as {
      programId?: string;
      name?: string;
      description?: string;
      costInPoints?: number;
      rewardType?: RewardType;
      stock?: number | null;
    };

    if (!body.programId || !body.name || !body.rewardType) {
      return fail("REWARD_INVALID", "programId, name and rewardType are required.", 400);
    }
    let costInPoints: number;
    let stock: number | null;
    try {
      costInPoints = validateAmount(body.costInPoints, "costInPoints", { min: 1 });
      stock = body.stock == null ? null : validateAmount(body.stock, "stock", { min: 0, allowZero: true });
    } catch (e) {
      const err = e as GuardrailError;
      return fail(err.code || "REWARD_INVALID", err.message, 400);
    }

    const result = createReward(getLoyaltyState(), {
      programId: body.programId,
      name: body.name,
      description: body.description,
      costInPoints,
      rewardType: body.rewardType,
      stock,
    });
    setLoyaltyState(result.state);

    return ok({ reward: result.reward });
  } catch (error) {
    return handleApiError(error, "REWARD_CREATE_FAILED");
  }
}
