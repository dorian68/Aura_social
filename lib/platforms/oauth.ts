/**
 * Unified OAuth orchestrator for all creator platforms.
 *
 * Each platform implements: buildAuthUrl, exchangeCode, fetchProfile.
 * This module is the router — callers only talk to this file.
 */
import { randomUUID } from "node:crypto";
import type { Platform } from "@/lib/superfan/types";
import type { OAuthState, OAuthTokens, PlatformProfile } from "./types";
import * as instagram from "./instagram";
import * as youtube from "./youtube";
import * as tiktok from "./tiktok";
import * as twitch from "./twitch";
import * as discord from "./discord";

type PlatformAdapter = {
  isConfigured(): boolean;
  buildAuthUrl(state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  fetchProfile(accessToken: string): Promise<PlatformProfile>;
};

const ADAPTERS: Partial<Record<Platform, PlatformAdapter>> = {
  instagram,
  youtube,
  tiktok,
  twitch,
  discord,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = ADAPTERS[platform];
  if (!adapter) throw new Error(`PLATFORM_UNSUPPORTED:${platform}`);
  return adapter;
}

export function isPlatformConfigured(platform: Platform): boolean {
  try { return getAdapter(platform).isConfigured(); } catch { return false; }
}

export function buildAuthUrl(platform: Platform, creatorId: string, redirectAfter?: string): { url: string; state: string } {
  const adapter = getAdapter(platform);
  if (!adapter.isConfigured()) throw new Error(`PLATFORM_NOT_CONFIGURED:${platform}`);
  const stateObj: OAuthState = { creatorId, platform, redirectAfter, nonce: randomUUID().slice(0,8) };
  const stateStr = Buffer.from(JSON.stringify(stateObj)).toString("base64url");
  return { url: adapter.buildAuthUrl(stateStr), state: stateStr };
}

export function parseState(stateStr: string): OAuthState {
  try {
    return JSON.parse(Buffer.from(stateStr, "base64url").toString("utf-8")) as OAuthState;
  } catch {
    throw new Error("INVALID_OAUTH_STATE");
  }
}

export async function exchangeCodeForProfile(platform: Platform, code: string, redirectUri: string): Promise<{ tokens: OAuthTokens; profile: PlatformProfile }> {
  const adapter = getAdapter(platform);
  const tokens = await adapter.exchangeCode(code, redirectUri);
  const profile = await adapter.fetchProfile(tokens.accessToken);
  return { tokens, profile };
}

export function listConfiguredPlatforms(): Platform[] {
  return (Object.keys(ADAPTERS) as Platform[]).filter(p => ADAPTERS[p]?.isConfigured());
}
