import { logMetaError, logMetaInfo, logMetaWarn } from "@/lib/meta/logger";
import { metaOk } from "@/lib/meta/routeHelpers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { event?: string; level?: string; data?: unknown };
  const payload = {
    clientEvent: String(body.event || "client.unknown").slice(0, 120),
    url: request.headers.get("referer"),
    data: body.data || {},
  };
  if (body.level === "error") logMetaError("meta.client_event", payload);
  else if (body.level === "warn") logMetaWarn("meta.client_event", payload);
  else logMetaInfo("meta.client_event", payload);
  return metaOk({ received: true });
}
