import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { getCommunityById } from "@/lib/superfan/db";
import { scanCommunity, scanFan } from "@/lib/signals/scanner";
import type { Platform } from "@/lib/superfan/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("NOT_FOUND", "Community not found", 404);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    const maxFans = typeof body.maxFans === "number" ? Math.min(body.maxFans, 200) : 50;

    // Targeted single-fan scan
    if (typeof body.fanId === "string" && typeof body.platform === "string") {
      const result = await scanFan(body.fanId, communityId, community.creatorId, body.platform as Platform);
      return ok({ mode: "single_fan", result });
    }

    // Community-wide scan
    const summary = await scanCommunity(communityId, community.creatorId, maxFans);
    return ok({ mode: "community", summary });
  } catch (e) { return handleApiError(e); }
}
