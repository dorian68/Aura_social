import { createMetaClient } from "@/lib/meta/metaClient";
import { buildOAuthPopupHtml, getRequestBaseUrl } from "@/lib/meta/oauth";
import { handleMetaRoute } from "@/lib/meta/routeHelpers";
import { consumeOAuthState, createFacebookConnectionFromLongLivedToken } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import { logMetaError, logMetaInfo } from "@/lib/meta/logger";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleMetaRoute("auth_facebook_callback", async () => {
    const code = request.nextUrl.searchParams.get("code") || "";
    const state = request.nextUrl.searchParams.get("state") || "";
    const denied = request.nextUrl.searchParams.get("error_message") || request.nextUrl.searchParams.get("error");
    let origin = getRequestBaseUrl(request);

    try {
      if (denied) throw new MetaAppError("META_LOGIN_CANCELLED", "Meta Login was cancelled or denied.", 401, denied);
      if (!code || !state) throw new MetaAppError("INVALID_OAUTH_CALLBACK", "Meta Login did not return an authorization code.", 400);
      const oauthState = consumeOAuthState(state);
      origin = oauthState.openerOrigin || origin;
      const metaClient = createMetaClient();
      const shortLived = await metaClient.exchangeFacebookAuthorizationCode(code, oauthState.redirectUri);
      const longLived = await metaClient.exchangeFacebookLongLivedToken(String(shortLived.access_token));
      const connection = await createFacebookConnectionFromLongLivedToken(metaClient, String(longLived.access_token));
      logMetaInfo("meta.oauth.facebook_success", { accountCount: connection.accounts.length });
      return html(buildOAuthPopupHtml({ origin, payload: { type: "META_AUTH_SUCCESS", mode: oauthState.mode, data: connection } }));
    } catch (error) {
      logMetaError("meta.oauth.facebook_failed", { message: error instanceof Error ? error.message : String(error) });
      return html(
        buildOAuthPopupHtml({
          origin,
          payload: {
            type: "META_AUTH_ERROR",
            error: {
              code: error instanceof MetaAppError ? error.code : "META_LOGIN_ERROR",
              message: error instanceof Error ? error.message : "Meta Login failed.",
              details: error instanceof MetaAppError ? error.details : null,
            },
          },
        }),
      );
    }
  });
}

function html(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/html" } });
}
