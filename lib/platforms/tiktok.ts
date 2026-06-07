/**
 * TikTok OAuth adapter (TikTok Login Kit).
 * Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
 * Docs: https://developers.tiktok.com/doc/login-kit-web
 */
import { createHash } from "node:crypto";
import type { OAuthTokens, PlatformProfile } from "./types";
import { getBaseUrl } from "./types";

export function isConfigured(): boolean {
  return !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function buildAuthUrl(state: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const redirectUri = `${getBaseUrl()}/api/auth/platforms/tiktok/callback`;
  const scopes = "user.info.basic,user.info.profile,user.info.stats";
  // TikTok requires PKCE
  const codeVerifier = state + "_verifier";
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const params = new URLSearchParams({
    client_key: clientKey, redirect_uri: redirectUri,
    response_type: "code", scope: scopes, state,
    code_challenge: codeChallenge, code_challenge_method: "S256",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    code, grant_type: "authorization_code", redirect_uri: redirectUri,
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`TIKTOK_TOKEN_ERROR:${res.status}`);
  const json = await res.json() as { data?: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }; error?: string };
  if (json.error || !json.data) throw new Error(`TIKTOK_TOKEN_ERROR:${JSON.stringify(json)}`);
  const { data } = json;
  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined;
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt, scope: data.scope };
}

export async function fetchProfile(accessToken: string): Promise<PlatformProfile> {
  const fields = ["open_id","display_name","avatar_url","follower_count","username"].join(",");
  const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`TIKTOK_PROFILE_ERROR:${res.status}`);
  const json = await res.json() as { data?: { user?: { display_name?: string; username?: string; avatar_url?: string; follower_count?: number; open_id?: string } }; error?: { code: string } };
  if (json.error?.code && json.error.code !== "ok") throw new Error(`TIKTOK_PROFILE_ERROR:${json.error.code}`);
  const user = json.data?.user ?? {};
  const handle = user.username ? `@${user.username}` : (user.open_id ?? "tiktok_user");
  return {
    platform: "tiktok", handle,
    displayName: user.display_name ?? handle,
    url: user.username ? `https://tiktok.com/@${user.username}` : undefined,
    followersCount: user.follower_count, avatarUrl: user.avatar_url,
    metadata: { openId: user.open_id },
  };
}
