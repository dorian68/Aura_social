import { metaOk } from "@/lib/meta/routeHelpers";
import { getPublicMetaClientConfig } from "@/lib/meta/configStore";
import { getRequestBaseUrl } from "@/lib/meta/oauth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return metaOk(getPublicMetaClientConfig(getRequestBaseUrl(request)));
}
