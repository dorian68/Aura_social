import { ok, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { spendPoints } from "@/lib/superfan/db";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { fanId, communityId, amount, note } = body as Record<string, unknown>;
    if (!fanId || !communityId || !amount) throw new DomainError("MISSING_PARAMS", "fanId, communityId and amount are required.", 400);
    const ledger = spendPoints(String(fanId), String(communityId), Number(amount), "manual", undefined, note ? String(note) : undefined);
    return ok({ ledger });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("INSUFFICIENT_POINTS"))
      return handleApiError(new DomainError("INSUFFICIENT_POINTS", e.message, 400), "DEDUCT_POINTS_ERROR");
    return handleApiError(e, "DEDUCT_POINTS_ERROR");
  }
}
