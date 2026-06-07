import { getAccessContext } from "@/lib/auth/access";
import { handleApiError, ok } from "@/lib/apiResponse";
import { approveOutreachDraft } from "@/lib/outreach/service";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const access = getAccessContext(request);
    const { id } = await context.params;
    return ok(
      approveOutreachDraft({
        outreachDraftId: id,
        subject: access.subject,
      }),
      { approvedByRole: access.role, externalCalls: 0 },
    );
  } catch (error) {
    return handleApiError(error, "OUTREACH_APPROVAL_FAILED");
  }
}
