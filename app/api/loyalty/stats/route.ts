import type { NextRequest } from "next/server";
import { ok } from "@/lib/apiResponse";
import { calculateProgramStats, getProgramLedger, segmentFans } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import { calculateTokenReadinessFromLoyalty } from "@/lib/loyalty/tokenEconomyEngine";

export async function GET(request: NextRequest) {
  const state = getLoyaltyState();
  const programId = request.nextUrl.searchParams.get("programId") || getDemoProgramId();
  const stats = calculateProgramStats(state, programId);

  return ok({
    stats,
    ledger: getProgramLedger(state, programId).slice(0, 25),
    segments: segmentFans(state, programId),
    tokenReadiness: calculateTokenReadinessFromLoyalty(stats),
  });
}
