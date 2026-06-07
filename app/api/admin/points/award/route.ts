import { ok, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { awardPoints } from "@/lib/superfan/db";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { fanId, communityId, amount, note } = body as Record<string, unknown>;
    if (!fanId || !communityId || !amount) throw new DomainError("MISSING_PARAMS", "fanId, communityId and amount are required.", 400);
    const ledger = awardPoints(String(fanId), String(communityId), Number(amount), "manual", undefined, note ? String(note) : undefined);
    return ok({ ledger });
  } catch (e) { return handleApiError(e, "AWARD_POINTS_ERROR"); }
}
