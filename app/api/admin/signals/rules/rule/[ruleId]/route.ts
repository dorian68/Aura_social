import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { getSignalRule, updateSignalRule, deleteSignalRule } from "@/lib/superfan/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ ruleId: string }> }) {
  try {
    const { ruleId } = await params;
    const rule = getSignalRule(ruleId);
    if (!rule) return fail("NOT_FOUND", "Signal rule not found", 404);

    const body = await readJsonBody(req);
    const updated = updateSignalRule(ruleId, {
      keywords: body.keywords,
      pointsReward: body.pointsReward,
      maxPerFan: body.maxPerFan,
      maxPerDay: body.maxPerDay,
      isActive: body.isActive,
      challengeId: body.challengeId,
    });
    return ok({ rule: updated });
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ ruleId: string }> }) {
  try {
    const { ruleId } = await params;
    const rule = getSignalRule(ruleId);
    if (!rule) return fail("NOT_FOUND", "Signal rule not found", 404);
    deleteSignalRule(ruleId);
    return ok({ deleted: true, ruleId });
  } catch (e) { return handleApiError(e); }
}
