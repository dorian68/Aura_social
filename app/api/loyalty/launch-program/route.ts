import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { createLoyaltyProgram } from "@/lib/loyalty/loyaltyEngine";
import { createDefaultLoyaltyRules } from "@/lib/loyalty/loyaltyRules";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { resolveConnectionAccount } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import { getDefaultWorkspaceId, recordAuditEvent } from "@/lib/workspace/store";
import { GuardrailError, validateBoundedString } from "@/lib/agentGuardrails";
import type { CreatorProfile } from "@/lib/loyalty/types";

export const runtime = "nodejs";

/**
 * Launches a REAL loyalty program tied to the connected Instagram account.
 * This is the first link of the product chain: IG connection → CreatorProfile →
 * LoyaltyProgram (+ default point rules). Idempotent: re-calling returns the
 * creator's existing program instead of creating a duplicate.
 */
export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as {
      connectionId?: string;
      igUserId?: string;
      programName?: string;
      pointsName?: string;
    };
    if (!body.connectionId || !body.igUserId) {
      return fail("LAUNCH_PROGRAM_INVALID", "connectionId and igUserId are required — connect Instagram first.", 400);
    }

    let account;
    try {
      ({ account } = resolveConnectionAccount(body.connectionId, body.igUserId));
    } catch (e) {
      if (e instanceof MetaAppError) return fail(e.code, e.message, e.status as number);
      throw e;
    }

    const creatorId = `creator_ig_${account.igUserId}`;
    let state = getLoyaltyState();

    // Idempotent — return the existing program if this creator already launched one.
    const existingCreator = state.creators.find((c) => c.id === creatorId);
    if (existingCreator?.loyaltyProgramId) {
      const existingProgram = state.programs.find((p) => p.id === existingCreator.loyaltyProgramId);
      if (existingProgram) {
        return ok({ creator: existingCreator, program: existingProgram, alreadyExisted: true }, { creatorId });
      }
    }

    const now = new Date().toISOString();
    const username = (account.username || account.igUserId).replace(/^@/, "");
    const programName = body.programName
      ? validateBoundedString(body.programName, "programName", 80).trim() || `${username} Inner Circle`
      : `${username} Inner Circle`;
    const pointsName = body.pointsName ? validateBoundedString(body.pointsName, "pointsName", 40).trim() || "Aura Points" : "Aura Points";

    // Program tied to THIS creator (not the demo seed).
    state = createLoyaltyProgram(
      state,
      { creatorId, name: programName, description: `Loyalty program for @${username}`, pointsName, status: "active" },
      now,
    );
    const program = state.programs[state.programs.length - 1];

    // Default earning rules for the new program.
    const rules = createDefaultLoyaltyRules(program.id, now);

    const creator: CreatorProfile = existingCreator
      ? { ...existingCreator, loyaltyProgramId: program.id, handle: `@${username}` }
      : {
          id: creatorId,
          name: account.name || `@${username}`,
          handle: `@${username}`,
          category: "Creator",
          region: "",
          connectedInstagramAccount: account.igUserId,
          loyaltyProgramId: program.id,
          createdAt: now,
        };

    state = {
      ...state,
      creators: existingCreator
        ? state.creators.map((c) => (c.id === creatorId ? creator : c))
        : [creator, ...state.creators],
      rules: [...state.rules, ...rules],
    };
    setLoyaltyState(state);

    recordAuditEvent({
      workspaceId: getDefaultWorkspaceId(),
      actorType: "creator",
      action: "loyalty.program_launched",
      targetType: "loyalty_program",
      targetId: program.id,
      severity: "info",
      message: `@${username} launched loyalty program "${program.name}".`,
      metadata: { creatorId, igUserId: account.igUserId, ruleCount: rules.length },
    });

    return ok({ creator, program, rules: rules.length, alreadyExisted: false }, { creatorId });
  } catch (e) {
    if (e instanceof GuardrailError) return fail(e.code, e.message, 400);
    return handleApiError(e, "LAUNCH_PROGRAM_FAILED");
  }
}
