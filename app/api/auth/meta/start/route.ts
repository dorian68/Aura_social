import { getMetaConfig } from "@/lib/meta/configStore";
import { createMetaClient } from "@/lib/meta/metaClient";
import { buildOAuthPopupHtml, createMetaOAuthRedirect, getRequestBaseUrl, resolvePostMessageOrigin } from "@/lib/meta/oauth";
import { handleMetaRoute } from "@/lib/meta/routeHelpers";
import { createFacebookConnectionFromLongLivedToken, createInstagramConnection } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleMetaRoute("auth_meta_start", async () => {
    const config = getMetaConfig();
    const mode = request.nextUrl.searchParams.get("mode") === "discovery" ? "discovery" : "private";
    // The opener page (e.g. the static product dashboard) may live on a different
    // origin than this API; it passes its origin so the popup can postMessage back.
    const openerOrigin = request.nextUrl.searchParams.get("origin");
    const metaClient = createMetaClient();

    if (config.mockMeta) {
      const connection =
        config.authMode === "facebook"
          ? await createFacebookConnectionFromLongLivedToken(metaClient, "mock-facebook-long-token")
          : await createInstagramConnection(metaClient, "mock-instagram-long-token", { user_id: "mock-ig-1" });
      return new NextResponse(
        buildOAuthPopupHtml({
          origin: resolvePostMessageOrigin(openerOrigin, getRequestBaseUrl(request)),
          payload: { type: "META_AUTH_SUCCESS", mode, data: connection },
        }),
        { headers: { "Content-Type": "text/html" } },
      );
    }

    if (!config.appId || !config.appSecret) {
      throw new MetaAppError("META_CONFIGURATION_ERROR", "Meta Login is not configured. Configure App ID and App Secret first.", 503);
    }
    if (config.authMode === "facebook" && !config.facebookLoginConfigId) {
      throw new MetaAppError(
        "FACEBOOK_BUSINESS_CONFIG_REQUIRED",
        "Facebook Login for Business needs a Configuration ID before OAuth can start.",
        503,
        "Create a configuration in Facebook Login for Business and paste its Configuration ID.",
      );
    }

    const { url } = createMetaOAuthRedirect(request, mode, openerOrigin);
    return NextResponse.redirect(url);
  });
}
