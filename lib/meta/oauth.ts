import { getMetaConfig, getMetaFrontendUrl } from "./configStore";
import { escapeHtml, summarizePublicId } from "./utils";
import { logMetaInfo } from "./logger";
import { createOAuthState } from "./tokenStore";
import type { NextRequest } from "next/server";

export function getRequestBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (host) return `${forwardedProto || "http"}://${host}`;
  return getMetaFrontendUrl();
}

/**
 * Resolve the targetOrigin used for window.opener.postMessage in the OAuth popup.
 * The popup runs on the API origin, but the opener page may be served from a
 * different origin (e.g. the static product dashboard, or opened via file://).
 * postMessage silently drops the message when targetOrigin does not match the
 * opener, so we must honour the opener's real origin. Falls back to "*" only
 * when the candidate is not a usable http(s) origin (e.g. file:// → "null").
 */
export function resolvePostMessageOrigin(candidate: string | null | undefined, fallback: string) {
  const fromCandidate = normalizeHttpOrigin(candidate);
  if (fromCandidate) return fromCandidate;
  // A candidate origin was explicitly provided but is not a usable http(s) origin
  // (e.g. a page opened via file:// reports its origin as "null"). Broadcast so the
  // opener still receives the result — the payload never contains access tokens.
  if (candidate != null && candidate !== "") return "*";
  const fromFallback = normalizeHttpOrigin(fallback);
  return fromFallback || "*";
}

function normalizeHttpOrigin(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function buildFacebookBusinessOAuthUrl(input: { redirectUri: string; state: string }) {
  const config = getMetaConfig();
  const dialogUrl = new URL(`https://www.facebook.com/${config.graphApiVersion}/dialog/oauth`);
  dialogUrl.searchParams.set("client_id", config.appId);
  dialogUrl.searchParams.set("redirect_uri", input.redirectUri);
  dialogUrl.searchParams.set("state", input.state);
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("override_default_response_type", "true");
  dialogUrl.searchParams.set("auth_type", "rerequest");
  dialogUrl.searchParams.set("config_id", config.facebookLoginConfigId);
  return dialogUrl;
}

export function buildInstagramOAuthUrl(input: { redirectUri: string; state: string }) {
  const config = getMetaConfig();
  const dialogUrl = new URL("https://www.instagram.com/oauth/authorize");
  dialogUrl.searchParams.set("enable_fb_login", "0");
  dialogUrl.searchParams.set("force_authentication", "1");
  dialogUrl.searchParams.set("client_id", config.appId);
  dialogUrl.searchParams.set("redirect_uri", input.redirectUri);
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("state", input.state);
  dialogUrl.searchParams.set("scope", ["instagram_business_basic", "instagram_business_manage_insights"].join(","));
  return dialogUrl;
}

export function createMetaOAuthRedirect(
  request: NextRequest,
  mode: "private" | "discovery" = "private",
  openerOrigin?: string | null,
) {
  const config = getMetaConfig();
  const requestBaseUrl = getRequestBaseUrl(request);
  const provider = config.authMode;
  const redirectPath = provider === "facebook" ? "/api/auth/facebook/callback" : "/api/auth/instagram/callback";
  const redirectUri = new URL(redirectPath, requestBaseUrl).toString();
  const state = createOAuthState({
    provider,
    mode,
    redirectUri,
    openerOrigin: resolvePostMessageOrigin(openerOrigin, requestBaseUrl),
  });
  const url = provider === "facebook" ? buildFacebookBusinessOAuthUrl({ redirectUri, state }) : buildInstagramOAuthUrl({ redirectUri, state });

  logMetaInfo("meta.oauth.redirect_created", {
    provider,
    mode,
    redirectUri,
    clientId: summarizePublicId(config.appId),
    hasConfigId: Boolean(config.facebookLoginConfigId),
    dialogHost: url.host,
  });

  return { url, provider, redirectUri };
}

export function buildOAuthPopupHtml(input: { origin: string; payload: unknown }) {
  const payload = JSON.stringify(input.payload).replaceAll("<", "\\u003c");
  const origin = JSON.stringify(input.origin);
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Meta Login</title></head>
  <body style="font-family: system-ui, sans-serif; margin: 32px;">
    <strong>Meta Login complete.</strong>
    <p>You can close this window.</p>
    <script>
      const payload = ${payload};
      if (window.opener) {
        window.opener.postMessage(payload, ${origin});
        window.close();
      }
    </script>
  </body>
</html>`;
}

export function buildDiagnosticCompleteHtml(input: { status: "completed" | "failed"; title: string; message: string }) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>${escapeHtml(input.title)}</title></head>
  <body style="font-family: system-ui, sans-serif; margin: 32px;">
    <strong>${escapeHtml(input.title)}</strong>
    <p>${escapeHtml(input.message)}</p>
    <p>You can close this window and return to the terminal.</p>
  </body>
</html>`;
}
