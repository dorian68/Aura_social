/**
 * Discord OAuth adapter.
 * Env: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
 * Docs: https://discord.com/developers/docs/topics/oauth2
 */
import type { OAuthTokens, PlatformProfile } from "./types";
import { getBaseUrl } from "./types";

export function isConfigured(): boolean {
  return !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

export function buildAuthUrl(state: string): string {
  const redirectUri = `${getBaseUrl()}/api/auth/platforms/discord/callback`;
  const scopes = "identify guilds";
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!, redirect_uri: redirectUri,
    response_type: "code", scope: scopes, state, prompt: "consent",
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!, client_secret: process.env.DISCORD_CLIENT_SECRET!,
    code, grant_type: "authorization_code", redirect_uri: redirectUri,
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`DISCORD_TOKEN_ERROR:${res.status}`);
  const json = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined;
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt, scope: json.scope };
}

export async function fetchProfile(accessToken: string): Promise<PlatformProfile> {
  const res = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`DISCORD_PROFILE_ERROR:${res.status}`);
  const user = await res.json() as { id: string; username: string; global_name?: string; avatar?: string; discriminator?: string };
  const handle = user.discriminator && user.discriminator !== "0" ? `${user.username}#${user.discriminator}` : `@${user.username}`;
  const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined;
  // Fetch server list to estimate community size
  let memberCount: number | undefined;
  try {
    const gRes = await fetch("https://discord.com/api/v10/users/@me/guilds", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (gRes.ok) {
      const guilds = await gRes.json() as Array<{ owner: boolean; approximate_member_count?: number }>;
      const owned = guilds.filter(g => g.owner);
      memberCount = owned.reduce((s, g) => s + (g.approximate_member_count ?? 0), 0) || undefined;
    }
  } catch { /* optional */ }
  return {
    platform: "discord", handle,
    displayName: user.global_name ?? user.username,
    followersCount: memberCount, avatarUrl,
    metadata: { userId: user.id },
  };
}
