/**
 * Instagram OAuth adapter (Meta Graph API).
 * Uses existing Meta OAuth infrastructure; wraps it in the unified adapter interface.
 */
import type { OAuthTokens, PlatformProfile } from "./types";
import { getBaseUrl } from "./types";

export function isConfigured(): boolean {
  return !!(process.env.META_APP_ID || process.env.FACEBOOK_APP_ID);
}

export function buildAuthUrl(state: string): string {
  const clientId = process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID ?? "";
  const redirectUri = `${getBaseUrl()}/api/auth/platforms/instagram/callback`;
  const scopes = ["instagram_basic", "instagram_content_publish", "pages_show_list"].join(",");
  return `https://www.facebook.com/v23.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const clientId = process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID ?? "";
  const clientSecret = process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET ?? "";
  const res = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`);
  if (!res.ok) throw new Error(`INSTAGRAM_TOKEN_ERROR:${res.status}`);
  const json = await res.json() as { access_token: string; expires_in?: number };
  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined;
  return { accessToken: json.access_token, expiresAt };
}

export async function fetchProfile(accessToken: string): Promise<PlatformProfile> {
  // Get linked Instagram Business account
  const pagesRes = await fetch(`https://graph.facebook.com/v23.0/me/accounts?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`);
  if (!pagesRes.ok) throw new Error(`INSTAGRAM_PAGES_ERROR:${pagesRes.status}`);
  const pagesJson = await pagesRes.json() as { data: Array<{ instagram_business_account?: { id: string } }> };
  const igAccountId = pagesJson.data?.[0]?.instagram_business_account?.id;
  if (!igAccountId) {
    // Fallback: basic profile
    const meRes = await fetch(`https://graph.facebook.com/v23.0/me?fields=name&access_token=${encodeURIComponent(accessToken)}`);
    const me = await meRes.json() as { name?: string };
    return { platform: "instagram", handle: "instagram_user", displayName: me.name ?? "Instagram User" };
  }
  const igRes = await fetch(`https://graph.facebook.com/v23.0/${igAccountId}?fields=username,name,followers_count,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`);
  if (!igRes.ok) throw new Error(`INSTAGRAM_PROFILE_ERROR:${igRes.status}`);
  const ig = await igRes.json() as { username?: string; name?: string; followers_count?: number; profile_picture_url?: string };
  return {
    platform: "instagram", handle: `@${ig.username ?? igAccountId}`,
    displayName: ig.name ?? ig.username ?? "Instagram User",
    url: `https://instagram.com/${ig.username}`,
    followersCount: ig.followers_count, avatarUrl: ig.profile_picture_url,
    metadata: { igAccountId },
  };
}
