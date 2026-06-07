import crypto from "node:crypto";
import { DomainError } from "../domainError";
import { redeemPoints } from "./loyaltyEngine";
import type { LoyaltyState, Reward, RewardEligibility, RewardType } from "./types";

export interface CreateRewardInput {
  programId: string;
  name: string;
  description?: string;
  costInPoints: number;
  rewardType: RewardType;
  stock?: number | null;
  status?: Reward["status"];
  unlockCondition?: string;
}

export function createReward(
  state: LoyaltyState,
  input: CreateRewardInput,
  now = new Date().toISOString(),
) {
  const reward: Reward = {
    id: `reward_${randomId()}`,
    programId: input.programId,
    name: input.name.trim(),
    description: input.description?.trim() || "Creator reward",
    costInPoints: Math.max(0, Math.round(input.costInPoints)),
    rewardType: input.rewardType,
    stock: input.stock ?? null,
    redeemedCount: 0,
    status: input.status || "active",
    unlockCondition: input.unlockCondition,
    createdAt: now,
    updatedAt: now,
  };

  return {
    state: {
      ...state,
      rewards: [...state.rewards, reward],
    },
    reward,
  };
}

export function checkRewardEligibility(
  state: LoyaltyState,
  programId: string,
  fanId: string,
  rewardId: string,
): RewardEligibility {
  const fan = state.fans.find((item) => item.id === fanId && item.programId === programId);
  const reward = state.rewards.find((item) => item.id === rewardId && item.programId === programId);

  if (!fan) {
    return {
      eligible: false,
      reason: "Fan does not exist in this program",
      missingPoints: 0,
      rewardId,
      fanId,
    };
  }

  if (!reward) {
    return {
      eligible: false,
      reason: "Reward does not exist in this program",
      missingPoints: 0,
      rewardId,
      fanId,
    };
  }

  if (reward.status !== "active") {
    return {
      eligible: false,
      reason: "Reward is not active",
      missingPoints: 0,
      rewardId,
      fanId,
    };
  }

  if (reward.stock !== null && reward.redeemedCount >= reward.stock) {
    return {
      eligible: false,
      reason: "Reward is out of stock",
      missingPoints: 0,
      rewardId,
      fanId,
    };
  }

  if (fan.pointsBalance < reward.costInPoints) {
    return {
      eligible: false,
      reason: "Insufficient points",
      missingPoints: reward.costInPoints - fan.pointsBalance,
      rewardId,
      fanId,
    };
  }

  return {
    eligible: true,
    reason: "Fan has enough points",
    missingPoints: 0,
    rewardId,
    fanId,
  };
}

export function redeemReward(
  state: LoyaltyState,
  {
    programId,
    fanId,
    rewardId,
  }: {
    programId: string;
    fanId: string;
    rewardId: string;
  },
) {
  const eligibility = checkRewardEligibility(state, programId, fanId, rewardId);
  if (!eligibility.eligible) {
    throw new DomainError(
      rewardErrorCode(eligibility.reason),
      eligibility.reason,
      eligibility.reason.includes("does not exist") ? 404 : 409,
      { rewardId, fanId, missingPoints: eligibility.missingPoints },
    );
  }

  const reward = state.rewards.find((item) => item.id === rewardId && item.programId === programId);
  if (!reward) {
    throw new DomainError("REWARD_NOT_FOUND", "Reward does not exist in this program.", 404, {
      programId,
      rewardId,
    });
  }

  const stateAfterPoints = redeemPoints(state, {
    programId,
    fanId,
    points: reward.costInPoints,
    referenceId: rewardId,
    metadata: {
      rewardName: reward.name,
      rewardType: reward.rewardType,
    },
  });

  const updatedReward: Reward = {
    ...reward,
    redeemedCount: reward.redeemedCount + 1,
    updatedAt: new Date().toISOString(),
  };

  return {
    eligibility,
    reward: updatedReward,
    state: {
      ...stateAfterPoints,
      rewards: stateAfterPoints.rewards.map((item) => (item.id === rewardId ? updatedReward : item)),
    },
  };
}

function randomId() {
  return crypto.randomUUID();
}

function rewardErrorCode(reason: string) {
  if (reason === "Insufficient points") return "REWARD_INSUFFICIENT_POINTS";
  if (reason === "Reward is out of stock") return "REWARD_OUT_OF_STOCK";
  if (reason === "Reward is not active") return "REWARD_NOT_ACTIVE";
  if (reason.startsWith("Fan does not exist")) return "LOYALTY_FAN_NOT_FOUND";
  if (reason.startsWith("Reward does not exist")) return "REWARD_NOT_FOUND";
  return "REWARD_REDEEM_REJECTED";
}
