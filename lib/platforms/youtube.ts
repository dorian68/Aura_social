/**
 * YouTube OAuth adapter (Google OAuth2 + YouTube Data API v3).
 * Env: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
 */
import type { OAuthTokens, PlatformProfile } from "./types";
import { getBaseUrl } from "./types";

export function isConfigured(): boolean {
  return !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
}

export function buildAuthUrl(state: string): string {
  const clientId = process.env.YOUTUBE_CLIENT_ID!;
  const redirectUri = `${getBaseUrl()}/api/auth/platforms/youtube/callback`;
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri,
    response_type: "code", scope: scopes, state,
    access_type: "offline", prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    code, client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    redirect_uri: redirectUri, grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!res.ok) throw new Error(`YOUTUBE_TOKEN_ERROR:${res.status}`);
  const json = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined;
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt, scope: json.scope };
}

export async function fetchProfile(accessToken: string): Promise<PlatformProfile> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YOUTUBE_PROFILE_ERROR:${res.status}`);
  const json = await res.json() as { items?: Array<{ id: string; snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } }; statistics?: { subscriberCount?: string } }> };
  const channel = json.items?.[0];
  if (!channel) throw new Error("YOUTUBE_NO_CHANNEL");
  const handle = channel.snippet.customUrl ?? `@${channel.id}`;
  return {
    platform: "youtube", handle,
    displayName: channel.snippet.title,
    url: `https://youtube.com/${handle}`,
    followersCount: channel.statistics?.subscriberCount ? parseInt(channel.statistics.subscriberCount, 10) : undefined,
    avatarUrl: channel.snippet.thumbnails?.default?.url,
    metadata: { channelId: channel.id },
  };
}
