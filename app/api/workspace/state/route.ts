import { ok } from "@/lib/apiResponse";
import { getAccessContext } from "@/lib/auth/access";
import { buildWorkspaceSnapshot } from "@/lib/workspace/status";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = getAccessContext(request);
  return ok(buildWorkspaceSnapshot(access.workspaceId), {
    access: {
      subject: access.subject,
      role: access.role,
      workspaceId: access.workspaceId,
    },
  });
}
