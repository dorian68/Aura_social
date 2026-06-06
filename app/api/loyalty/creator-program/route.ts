import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { calculateProgramStats } from "@/lib/loyalty/loyaltyEngine";
import { getLoyaltyState } from "@/lib/loyalty/store";
import { resolveConnectionAccount } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Returns the loyalty program of the CONNECTED creator (keyed to their IG
 * account), or { launched: false } if they haven't launched one yet. The
 * dashboard uses this to show the real program (honest empty/zero for a fresh
 * account) instead of the demo seed — and to decide whether to show the
 * "Launch program" CTA.
 */
export async function GET(request: NextRequest) {
  try {
    const connectionId = request.nextUrl.searchParams.get("connectionId") || "";
    const igUserId = request.nextUrl.searchParams.get("igUserId") || "";
    if (!connectionId || !igUserId) {
      return fail("MISSING_PARAMS", "connectionId and igUserId are required.", 400);
    }

    let account;
    try {
      ({ account } = resolveConnectionAccount(connectionId, igUserId));
    } catch (e) {
      if (e instanceof MetaAppError) return fail(e.code, e.message, e.status as number);
      throw e;
    }

    const creatorId = `creator_ig_${account.igUserId}`;
    const state = getLoyaltyState();
    const creator = state.creators.find((c) => c.id === creatorId) || null;

    if (!creator?.loyaltyProgramId) {
      return ok({ launched: false, creatorId, creator, program: null, stats: null });
    }
    const program = state.programs.find((p) => p.id === creator.loyaltyProgramId) || null;
    if (!program) {
      return ok({ launched: false, creatorId, creator, program: null, stats: null });
    }

    const stats = calculateProgramStats(state, program.id);
    return ok({
      launched: true,
      creatorId,
      creator,
      program,
      stats,
      counts: {
        rules: state.rules.filter((r) => r.programId === program.id).length,
        rewards: state.rewards.filter((r) => r.programId === program.id).length,
        fanPasses: state.fanPasses.filter((p) => p.programId === program.id).length,
      },
    });
  } catch (e) {
    return handleApiError(e, "CREATOR_PROGRAM_FAILED");
  }
}
