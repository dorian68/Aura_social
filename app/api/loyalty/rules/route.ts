import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import type { LoyaltyActionType, LoyaltyRule } from "@/lib/loyalty/types";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as Partial<LoyaltyRule>;
    if (!body.programId || !body.actionType || typeof body.points !== "number") {
      return fail("LOYALTY_RULE_INVALID", "programId, actionType and points are required.", 400);
    }

    const state = getLoyaltyState();
    const existing = state.rules.find(
      (rule) => rule.programId === body.programId && rule.actionType === body.actionType,
    );
    const now = new Date().toISOString();
    const nextRule: LoyaltyRule = {
      id: existing?.id || `rule_${body.programId}_${body.actionType}`,
      programId: body.programId,
      actionType: body.actionType as LoyaltyActionType,
      points: Math.max(0, Math.round(body.points)),
      pointsPerUnit: body.pointsPerUnit,
      active: body.active ?? true,
      description: body.description || existing?.description || "Custom loyalty rule",
      source: body.source || existing?.source || "custom",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    setLoyaltyState({
      ...state,
      rules: existing
        ? state.rules.map((rule) => (rule.id === existing.id ? nextRule : rule))
        : [...state.rules, nextRule],
    });

    return ok({ rule: nextRule });
  } catch (error) {
    return handleApiError(error, "LOYALTY_RULE_SAVE_FAILED");
  }
}
