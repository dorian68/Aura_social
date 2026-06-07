import { getAccessContext } from "@/lib/auth/access";
import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { sendOutreachDraft } from "@/lib/outreach/service";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const access = getAccessContext(request);
    const body = (await readJsonBody(request).catch(() => ({}))) as Record<string, unknown>;
    const { id } = await context.params;
    const result = await sendOutreachDraft({
      workspaceId: access.workspaceId,
      outreachDraftId: id,
      recipient: String(body.recipient || ""),
      dryRun: body.dryRun !== false,
    });
    return ok(result, {
      dryRun: result.delivery.dryRun,
      externalCalls: result.externalCalls,
    });
  } catch (error) {
    return handleApiError(error, "OUTREACH_SEND_FAILED");
  }
}
