import type { NextRequest } from "next/server";
import { ok } from "@/lib/apiResponse";
import { getTopFans, segmentFans } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";

export async function GET(request: NextRequest) {
  const state = getLoyaltyState();
  const programId = request.nextUrl.searchParams.get("programId") || getDemoProgramId();

  return ok({
    fans: state.fans.filter((fan) => fan.programId === programId),
    topFans: getTopFans(state, programId, 10),
    segments: segmentFans(state, programId),
  });
}
