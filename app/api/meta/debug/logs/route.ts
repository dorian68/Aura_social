import { getMetaLogFilePath, readRecentMetaLogs } from "@/lib/meta/logger";
import { metaOk } from "@/lib/meta/routeHelpers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const lines = Number(request.nextUrl.searchParams.get("lines") || 200);
  return metaOk({ file: getMetaLogFilePath(), entries: readRecentMetaLogs(lines) });
}
