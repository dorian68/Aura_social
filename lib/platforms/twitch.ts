/**
 * Twitch OAuth adapter (Twitch API / Helix).
 * Env: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
 * Docs: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth
 */
import type { OAuthTokens, PlatformProfile } from "./types";
import { getBaseUrl } from "./types";

export function isConfigured(): boolean {
  return !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
}

export function buildAuthUrl(state: string): string {
  const redirectUri = `${getBaseUrl()}/api/auth/platforms/twitch/callback`;
  const scopes = "user:read:follows user:read:subscriptions channel:read:subscriptions";
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!, redirect_uri: redirectUri,
    response_type: "code", scope: scopes, state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!, client_secret: process.env.TWITCH_CLIENT_SECRET!,
    code, grant_type: "authorization_code", redirect_uri: redirectUri,
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`TWITCH_TOKEN_ERROR:${res.status}`);
  const json = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string[] };
  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined;
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt, scope: json.scope?.join(" ") };
}

export async function fetchProfile(accessToken: string): Promise<PlatformProfile> {
  const clientId = process.env.TWITCH_CLIENT_ID!;
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": clientId },
  });
  if (!res.ok) throw new Error(`TWITCH_PROFILE_ERROR:${res.status}`);
  const json = await res.json() as { data?: Array<{ id: string; login: string; display_name: string; profile_image_url: string }> };
  const user = json.data?.[0];
  if (!user) throw new Error("TWITCH_NO_USER");
  // Fetch follower count separately (requires broadcaster_id)
  let followerCount: number | undefined;
  try {
    const fRes = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": clientId },
    });
    if (fRes.ok) {
      const fJson = await fRes.json() as { total?: number };
      followerCount = fJson.total;
    }
  } catch { /* follower count is optional */ }
  return {
    platform: "twitch", handle: `@${user.login}`,
    displayName: user.display_name,
    url: `https://twitch.tv/${user.login}`,
    followersCount: followerCount, avatarUrl: user.profile_image_url,
    metadata: { userId: user.id },
  };
}
