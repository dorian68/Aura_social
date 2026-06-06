import type { LoyaltyActionType, LoyaltyRule } from "./types";

export const DEFAULT_RULE_POINTS: Record<LoyaltyActionType, number> = {
  like: 1,
  comment: 5,
  save: 10,
  share: 15,
  purchase: 100,
  event_attendance: 250,
  referral: 500,
  manual_bonus: 100,
  reward_redemption: 0,
};

export function createDefaultLoyaltyRules(programId: string, now = new Date().toISOString()) {
  return [
    buildRule(programId, "like", "Like a creator post", "instagram", now),
    buildRule(programId, "comment", "Comment on a post or reel", "instagram", now),
    buildRule(programId, "save", "Save useful content", "instagram", now),
    buildRule(programId, "share", "Share to story or DM", "instagram", now),
    buildRule(programId, "purchase", "Purchase a product, ticket, or service", "purchase", now, 100),
    buildRule(programId, "event_attendance", "Attend an event or live session", "event", now),
    buildRule(programId, "referral", "Refer a new fan or customer", "referral", now),
    buildRule(programId, "manual_bonus", "Manual creator bonus", "manual", now),
  ] satisfies LoyaltyRule[];
}

export function calculatePointsForAction({
  rules,
  actionType,
  quantity = 1,
  monetaryAmount,
  pointsOverride,
}: {
  rules: LoyaltyRule[];
  actionType: LoyaltyActionType;
  quantity?: number;
  monetaryAmount?: number;
  pointsOverride?: number;
}) {
  if (typeof pointsOverride === "number") {
    return Math.max(0, Math.round(pointsOverride));
  }

  const rule = rules.find((item) => item.actionType === actionType && item.active);
  const basePoints = rule?.points ?? DEFAULT_RULE_POINTS[actionType] ?? 0;
  const multiplier = actionType === "purchase" ? monetaryAmount ?? quantity : quantity;

  return Math.max(0, Math.round(basePoints * Math.max(0, multiplier)));
}

function buildRule(
  programId: string,
  actionType: LoyaltyActionType,
  description: string,
  source: LoyaltyRule["source"],
  now: string,
  pointsPerUnit?: number,
): LoyaltyRule {
  return {
    id: `rule_${programId}_${actionType}`,
    programId,
    actionType,
    points: DEFAULT_RULE_POINTS[actionType],
    pointsPerUnit,
    active: true,
    description,
    source,
    createdAt: now,
    updatedAt: now,
  };
}
