import { buildPrivateAnalytics } from "@/lib/meta/privateAnalytics";
import { createMetaClient } from "@/lib/meta/metaClient";
import { fetchPrivateMediaWithInsights } from "@/lib/meta/insightService";
import { logMetaInfo } from "@/lib/meta/logger";
import { handleMetaRoute, metaOk } from "@/lib/meta/routeHelpers";
import { resolvePrivateAccess } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleMetaRoute("private_insights", async () => {
    const igUserId = request.nextUrl.searchParams.get("igUserId")?.trim() || "";
    if (!igUserId) throw new MetaAppError("MISSING_IG_USER_ID", "Select an Instagram account first.", 400);
    const access = resolvePrivateAccess({
      connectionId: request.nextUrl.searchParams.get("connectionId") || "",
      igUserId,
      accessToken: request.nextUrl.searchParams.get("accessToken") || "",
      authProvider: request.nextUrl.searchParams.get("authProvider") || "",
    });
    const metaClient = createMetaClient();
    const payload = await fetchPrivateMediaWithInsights(metaClient, igUserId, access.accessToken, access.authProvider);
    const analytics = buildPrivateAnalytics(payload);
    logMetaInfo("meta.private_insights_success", {
      igUserId,
      username: analytics.profile.username,
      mediaCount: analytics.media.length,
      warningCount: analytics.warnings.length,
      totalReach: analytics.overview.total_reach,
    });
    return metaOk(analytics, { mockMeta: metaClient.mock });
  });
}
