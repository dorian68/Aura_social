import type { Platform } from "@/lib/superfan/types";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  profileUrl: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
}

export interface PlatformProfile {
  platform: Platform;
  handle: string;
  displayName: string;
  url?: string;
  followersCount?: number;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface OAuthState {
  creatorId: string;
  platform: Platform;
  redirectAfter?: string;
  nonce: string;
}

// Platform OAuth env-var conventions:
// TIKTOK_CLIENT_ID, TIKTOK_CLIENT_SECRET
// YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET (Google OAuth)
// TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
// DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET

export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3009";
}
