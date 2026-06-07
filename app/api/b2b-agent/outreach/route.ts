import { getAccessContext } from "@/lib/auth/access";
import { ok } from "@/lib/apiResponse";
import { getB2BAgentState } from "@/lib/b2b-agent/store";
import { listOutreachDeliveries } from "@/lib/outreach/repository";
import { getOutreachReadiness } from "@/lib/outreach/service";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = getAccessContext(request);
  return ok({
    readiness: getOutreachReadiness(),
    drafts: getB2BAgentState().outreachDrafts,
    deliveries: listOutreachDeliveries(access.workspaceId),
  });
}
