import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { getRedemptionById, updateRedemptionStatus } from "@/lib/superfan/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const redemption = getRedemptionById(id);
    if (!redemption) return fail("REDEMPTION_NOT_FOUND", "Redemption not found.", 404);
    if (redemption.status !== "pending") return fail("ALREADY_PROCESSED", `Redemption is ${redemption.status}.`, 400);
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    updateRedemptionStatus(id, "fulfilled", body.note);
    return ok({ fulfilled: true });
  } catch (e) { return handleApiError(e, "FULFILL_ERROR"); }
}
