import crypto from "node:crypto";
import { DomainError } from "../domainError";
import { calculatePointsForAction } from "./loyaltyRules";
import type {
  AwardPointsInput,
  CreateProgramInput,
  FanProfile,
  FanSegment,
  FanTier,
  LoyaltyProgram,
  LoyaltyProgramStats,
  LoyaltyState,
  LoyaltyTransaction,
  RedeemPointsInput,
} from "./types";

const POINT_LIABILITY_VALUE = 0.01;

export function createLoyaltyProgram(
  state: LoyaltyState,
  input: CreateProgramInput,
  now = new Date().toISOString(),
) {
  const program: LoyaltyProgram = {
    id: `program_${cryptoRandomId()}`,
    creatorId: input.creatorId,
    name: input.name.trim(),
    description: input.description?.trim() || "Creator loyalty program",
    pointsName: input.pointsName?.trim() || "Aura Points",
    pointsSymbol: input.pointsSymbol?.trim().toUpperCase() || "AURA",
    status: input.status || "draft",
    tokenizationMode: input.tokenizationMode || "offchain",
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...state,
    programs: [...state.programs, program],
  };
}

export function awardPoints(state: LoyaltyState, input: AwardPointsInput) {
  const fan = getRequiredFan(state, input.programId, input.fanId);
  const rules = state.rules.filter((rule) => rule.programId === input.programId);
  const points = calculatePointsForAction({
    rules,
    actionType: input.actionType,
    quantity: input.quantity,
    monetaryAmount: input.monetaryAmount,
    pointsOverride: input.pointsOverride,
  });

  const transaction = createTransaction({
    programId: input.programId,
    fanId: input.fanId,
    actionType: input.actionType,
    pointsDelta: points,
    source: input.source || rules.find((rule) => rule.actionType === input.actionType)?.source || "custom",
    referenceId: input.referenceId,
    metadata: input.metadata || {},
  });

  return applyFanAndTransaction(state, fan, points, transaction);
}

export function redeemPoints(state: LoyaltyState, input: RedeemPointsInput) {
  if (input.points <= 0) {
    throw new DomainError("LOYALTY_POINTS_INVALID", "Redeemed points must be greater than zero.", 400);
  }

  const fan = getRequiredFan(state, input.programId, input.fanId);
  if (fan.pointsBalance < input.points) {
    throw new DomainError(
      "LOYALTY_INSUFFICIENT_POINTS",
      `Insufficient points. Missing ${input.points - fan.pointsBalance} points.`,
      409,
      { missingPoints: input.points - fan.pointsBalance },
    );
  }

  const transaction = createTransaction({
    programId: input.programId,
    fanId: input.fanId,
    actionType: "reward_redemption",
    pointsDelta: -input.points,
    source: "manual",
    referenceId: input.referenceId,
    metadata: input.metadata || {},
  });

  return applyFanAndTransaction(state, fan, -input.points, transaction);
}

export function calculateTier(pointsBalance: number): FanTier {
  if (pointsBalance >= 2000) return "Inner Circle";
  if (pointsBalance >= 500) return "Superfan";
  if (pointsBalance >= 100) return "Engaged Fan";
  return "New Fan";
}

export function getFanBalance(state: LoyaltyState, fanId: string) {
  return state.fans.find((fan) => fan.id === fanId)?.pointsBalance ?? 0;
}

export function getProgramLedger(state: LoyaltyState, programId: string) {
  return state.transactions
    .filter((transaction) => transaction.programId === programId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTopFans(state: LoyaltyState, programId: string, limit = 10) {
  return state.fans
    .filter((fan) => fan.programId === programId)
    .sort((a, b) => b.pointsBalance - a.pointsBalance)
    .slice(0, limit);
}

export function calculateProgramStats(state: LoyaltyState, programId: string): LoyaltyProgramStats {
  const fans = state.fans.filter((fan) => fan.programId === programId);
  const transactions = state.transactions.filter((transaction) => transaction.programId === programId);
  const totalPointsIssued = transactions
    .filter((transaction) => transaction.pointsDelta > 0)
    .reduce((total, transaction) => total + transaction.pointsDelta, 0);
  const totalPointsRedeemed = Math.abs(
    transactions
      .filter((transaction) => transaction.pointsDelta < 0)
      .reduce((total, transaction) => total + transaction.pointsDelta, 0),
  );

  const tierCounts: LoyaltyProgramStats["tierCounts"] = {
    "New Fan": 0,
    "Engaged Fan": 0,
    Superfan: 0,
    "Inner Circle": 0,
  };

  for (const fan of fans) {
    tierCounts[fan.tier] += 1;
  }

  return {
    totalPointsIssued,
    totalPointsRedeemed,
    outstandingLiability: roundCurrency((totalPointsIssued - totalPointsRedeemed) * POINT_LIABILITY_VALUE),
    activeFans: fans.length,
    rewardsRedeemed: state.rewards
      .filter((reward) => reward.programId === programId)
      .reduce((total, reward) => total + reward.redeemedCount, 0),
    averageFanBalance: fans.length
      ? Math.round(fans.reduce((total, fan) => total + fan.pointsBalance, 0) / fans.length)
      : 0,
    tierCounts,
  };
}

export function segmentFans(state: LoyaltyState, programId: string): FanSegment[] {
  const fans = state.fans.filter((fan) => fan.programId === programId);
  return [
    buildSegment("Inner Circle", "Fans with 2,000+ points and the strongest monetization signal.", fans, [
      "Inner Circle",
    ]),
    buildSegment("Superfans", "Fans ready for premium rewards, VIP passes, and personal outreach.", fans, [
      "Superfan",
    ]),
    buildSegment("Near Superfan", "Engaged fans within 100 points of Superfan tier.", fans.filter((fan) => {
      return fan.pointsBalance >= 400 && fan.pointsBalance < 500;
    })),
    buildSegment("New Fans", "New community members who need activation campaigns.", fans, ["New Fan"]),
  ];
}

function applyFanAndTransaction(
  state: LoyaltyState,
  fan: FanProfile,
  pointsDelta: number,
  transaction: LoyaltyTransaction,
) {
  const updatedFan: FanProfile = {
    ...fan,
    pointsBalance: Math.max(0, fan.pointsBalance + pointsDelta),
    lifetimePoints: pointsDelta > 0 ? fan.lifetimePoints + pointsDelta : fan.lifetimePoints,
    lastInteractionAt: transaction.createdAt,
  };
  updatedFan.tier = calculateTier(updatedFan.pointsBalance);

  return {
    ...state,
    fans: state.fans.map((item) => (item.id === fan.id ? updatedFan : item)),
    transactions: [...state.transactions, transaction],
  };
}

function createTransaction(input: Omit<LoyaltyTransaction, "id" | "createdAt">): LoyaltyTransaction {
  return {
    ...input,
    id: `txn_${cryptoRandomId()}`,
    createdAt: new Date().toISOString(),
  };
}

function getRequiredFan(state: LoyaltyState, programId: string, fanId: string) {
  const fan = state.fans.find((item) => item.id === fanId && item.programId === programId);
  if (!fan) {
    throw new DomainError(
      "LOYALTY_FAN_NOT_FOUND",
      "Fan does not exist in this loyalty program.",
      404,
      { programId, fanId },
    );
  }
  return fan;
}

function buildSegment(
  name: string,
  description: string,
  allFansOrSegment: FanProfile[],
  tiers?: FanTier[],
): FanSegment {
  const fans = tiers ? allFansOrSegment.filter((fan) => tiers.includes(fan.tier)) : allFansOrSegment;
  return {
    name,
    description,
    fanCount: fans.length,
    fanIds: fans.map((fan) => fan.id),
    averageBalance: fans.length
      ? Math.round(fans.reduce((total, fan) => total + fan.pointsBalance, 0) / fans.length)
      : 0,
  };
}

function cryptoRandomId() {
  return crypto.randomUUID();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
