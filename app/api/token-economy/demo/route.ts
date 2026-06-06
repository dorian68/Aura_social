import type { NextRequest } from "next/server";
import { ok } from "@/lib/apiResponse";
import { calculateProgramStats } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import {
  applyLoyaltyStatsToEconomy,
  calculateTokenReadinessFromLoyalty,
  validateTokenEconomyConfig,
} from "@/lib/loyalty/tokenEconomyEngine";

export async function GET(request: NextRequest) {
  const state = getLoyaltyState();
  const programId = request.nextUrl.searchParams.get("programId") || getDemoProgramId();
  const stats = calculateProgramStats(state, programId);
  const economy = state.tokenEconomies.find((item) => item.programId === programId);

  return ok({
    economy: economy ? applyLoyaltyStatsToEconomy(economy, stats) : null,
    validation: economy ? validateTokenEconomyConfig(economy) : null,
    readiness: calculateTokenReadinessFromLoyalty(stats),
  });
}
