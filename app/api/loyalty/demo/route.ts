import { ok } from "@/lib/apiResponse";
import { calculateProgramStats, getTopFans, segmentFans } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";

export async function GET() {
  const state = getLoyaltyState();
  const programId = getDemoProgramId();

  return ok({
    state,
    stats: calculateProgramStats(state, programId),
    topFans: getTopFans(state, programId, 5),
    segments: segmentFans(state, programId),
  });
}
