import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCompletionById, updateCompletionStatus } from "@/lib/superfan/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const completion = getCompletionById(id);
    if (!completion) return fail("COMPLETION_NOT_FOUND", "Completion not found.", 404);
    if (completion.status !== "pending") return fail("ALREADY_PROCESSED", `Completion is already ${completion.status}.`, 400);
    updateCompletionStatus(id, "rejected", "creator");
    return ok({ rejected: true });
  } catch (e) { return handleApiError(e, "REJECT_ERROR"); }
}
