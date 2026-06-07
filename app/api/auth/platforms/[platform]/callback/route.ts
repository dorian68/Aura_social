import { NextResponse } from "next/server";
import { fail, handleApiError } from "@/lib/apiResponse";
import { exchangeCodeForProfile, parseState, isPlatformConfigured } from "@/lib/platforms/oauth";
import { upsertPlatformAccount, getCreator, upsertFanPlatformAccount, getFanById } from "@/lib/superfan/db";
import { getBaseUrl } from "@/lib/platforms/types";
import type { Platform } from "@/lib/superfan/types";

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const reqUrl = new URL(req.url);
    const code = reqUrl.searchParams.get("code");
    const stateParam = reqUrl.searchParams.get("state");
    const errorParam = reqUrl.searchParams.get("error");

    if (errorParam) {
      const desc = reqUrl.searchParams.get("error_description") ?? errorParam;
      return redirectToError(desc);
    }

    if (!code || !stateParam) return fail("MISSING_OAUTH_PARAMS", "code and state are required.", 400);
    if (!isPlatformConfigured(platform as Platform)) return fail("PLATFORM_NOT_CONFIGURED", `${platform} OAuth is not configured.`, 503);

    // CSRF: accept either the creator state cookie or the fan state cookie
    const cookieHeader = req.headers.get("cookie") ?? "";
    const creatorStateCookie = parseCookie(cookieHeader, `oauth_state_${platform}`);
    const fanStateCookie = parseCookie(cookieHeader, `oauth_fan_state_${platform}`);
    const expectedState = creatorStateCookie ?? fanStateCookie;
    if (expectedState && expectedState !== stateParam) return fail("INVALID_OAUTH_STATE", "State mismatch. Possible CSRF attempt.", 403);

    const state = parseState(stateParam);
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/platforms/${platform}/callback`;

    const { tokens, profile } = await exchangeCodeForProfile(platform as Platform, code, redirectUri);

    let redirectTarget: string;
    const response = (() => {
      if (state.type === "fan" && state.fanId) {
        // ── Fan OAuth ──────────────────────────────────────────────────────────
        if (!getFanById(state.fanId)) return fail("FAN_NOT_FOUND", `Fan ${state.fanId} not found.`, 404);

        upsertFanPlatformAccount({
          fanId: state.fanId,
          platform: platform as Platform,
          handle: profile.handle,
          url: profile.url,
          followersCount: profile.followersCount,
          connectedStatus: "connected",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          metadata: profile.metadata,
        });

        redirectTarget = state.redirectAfter ?? `${baseUrl}/fan/${state.fanId}`;
        const res = NextResponse.redirect(`${redirectTarget}?connected=${platform}`);
        res.cookies.set(`oauth_fan_state_${platform}`, "", { maxAge: 0, path: "/" });
        return res;

      } else if (state.creatorId) {
        // ── Creator OAuth ──────────────────────────────────────────────────────
        if (!getCreator(state.creatorId)) return fail("CREATOR_NOT_FOUND", `Creator ${state.creatorId} not found.`, 404);

        const account = upsertPlatformAccount({
          creatorId: state.creatorId,
          platform: platform as Platform,
          handle: profile.handle,
          url: profile.url,
          followersCount: profile.followersCount,
          connectedStatus: "connected",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          metadata: profile.metadata,
        });

        redirectTarget = state.redirectAfter ?? `${baseUrl}/dashboard`;
        const res = NextResponse.redirect(`${redirectTarget}?connected=${platform}`);
        res.cookies.set(`oauth_state_${platform}`, "", { maxAge: 0, path: "/" });
        res.cookies.set(`oauth_connected_${platform}`, account.id, { httpOnly: true, maxAge: 3600, path: "/" });
        return res;

      } else {
        return fail("INVALID_OAUTH_STATE", "State missing both creatorId and fanId.", 400);
      }
    })();

    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OAuth callback failed";
    return redirectToError(msg);
  }
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";").map(s => s.trim())) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function redirectToError(message: string): NextResponse {
  const base = getBaseUrl();
  return NextResponse.redirect(`${base}/dashboard?oauth_error=${encodeURIComponent(message)}`);
}
