import crypto from "node:crypto";
import { MetaAppError } from "./utils";
import { logMetaInfo, logMetaWarn } from "./logger";
import type { ConnectedInstagramAccount, MetaConnection, OAuthStateRecord, StoredMetaConnection } from "./types";
import type { MetaClient } from "./metaClient";
import { recordMetaConnectedAccounts } from "@/lib/workspace/store";

// These in-memory maps MUST be process-wide singletons. Under `next dev`, a
// module can be evaluated in several route bundles, giving each its own `new
// Map()` — which means an OAuth `state` created by /auth/meta/start is invisible
// to /auth/instagram/callback (→ spurious OAUTH_STATE_EXPIRED) and a saved
// connection is invisible to /private-insights. Pinning them on globalThis keeps
// one shared instance across all route modules (same pattern as the loyalty store).
const globalForMeta = globalThis as typeof globalThis & {
  __auraMetaTokenStore?: Map<string, StoredMetaConnection>;
  __auraMetaOAuthStateStore?: Map<string, OAuthStateRecord>;
};
const tokenStore = (globalForMeta.__auraMetaTokenStore ??= new Map<string, StoredMetaConnection>());
const oauthStateStore = (globalForMeta.__auraMetaOAuthStateStore ??= new Map<string, OAuthStateRecord>());
// Session lifetime for a connected account. Default 30 days (the IG long-lived
// token is valid ~60 days, so this stays well within validity) — override with
// META_CONNECTION_TTL_HOURS. Note: the store is in-memory, so it is also bounded
// by the server process lifetime.
const CONNECTION_TTL_MS = Math.max(1, Number(process.env.META_CONNECTION_TTL_HOURS) || 720) * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type PageRecord = {
  id?: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
};

type PageIgResponse = {
  instagram_business_account?: {
    id?: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
  };
};

export function createOAuthState(payload: Omit<OAuthStateRecord, "createdAt" | "expiresAt">) {
  cleanupExpiredOAuthStates();
  const state = crypto.randomUUID();
  oauthStateStore.set(state, { ...payload, createdAt: Date.now(), expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
  return state;
}

export function consumeOAuthState(state: string) {
  const record = oauthStateStore.get(state);
  oauthStateStore.delete(state);
  if (!record || record.expiresAt < Date.now()) {
    throw new MetaAppError("OAUTH_STATE_EXPIRED", "The Meta Login session expired. Please try again.", 401);
  }
  return record;
}

export async function createFacebookConnectionFromLongLivedToken(metaClient: MetaClient, longLivedUserToken: string): Promise<MetaConnection> {
  const accounts = await findConnectedInstagramAccounts(metaClient, longLivedUserToken);
  if (!accounts.length) {
    throw new MetaAppError(
      "NO_INSTAGRAM_BUSINESS_ACCOUNTS",
      "No connected Instagram Business or Creator accounts were found for this Facebook user.",
      404,
      "Make sure the Instagram account is professional and linked to a Facebook Page you manage.",
    );
  }
  return saveConnection(longLivedUserToken, accounts, "facebook");
}

export async function createInstagramConnection(metaClient: MetaClient, accessToken: string, tokenDetails: Record<string, unknown> = {}): Promise<MetaConnection> {
  const profile = await metaClient.fetchInstagramProfile(String(tokenDetails.user_id || "me"), accessToken, "instagram");
  const profileRecord = profile as Record<string, unknown>;
  const account: ConnectedInstagramAccount = {
    igUserId: String(profileRecord.id || tokenDetails.user_id || "me"),
    username: String(profileRecord.username || ""),
    name: String(profileRecord.name || profileRecord.username || "Instagram account"),
    profilePictureUrl: String(profileRecord.profile_picture_url || ""),
    followersCount: Number(profileRecord.followers_count || 0),
    mediaCount: Number(profileRecord.media_count || 0),
    pageId: null,
    pageName: "Instagram Login",
    accessToken,
    authProvider: "instagram",
  };
  return saveConnection(accessToken, [account], "instagram");
}

export async function findConnectedInstagramAccounts(metaClient: MetaClient, longLivedUserToken: string) {
  const pagesResponse = await metaClient.fetchPages(longLivedUserToken);
  const pages = Array.isArray(pagesResponse?.data) ? (pagesResponse.data as PageRecord[]) : [];
  const accounts: ConnectedInstagramAccount[] = [];

  logMetaInfo("meta.facebook.pages_fetched", {
    pageCount: pages.length,
    pages: pages.map((page) => ({
      id: page.id,
      name: page.name,
      hasAccessToken: Boolean(page.access_token),
      tasks: page.tasks || [],
    })),
  });

  for (const page of pages) {
    if (!page.id) continue;
    try {
      const pageAccessToken = page.access_token || longLivedUserToken;
      const details = (await metaClient.fetchPageInstagramAccount(page.id, pageAccessToken)) as PageIgResponse;
      const ig = details.instagram_business_account;
      if (!ig?.id) {
        logMetaWarn("meta.facebook.page_instagram_missing", { pageId: page.id, pageName: page.name, responseKeys: Object.keys(details || {}) });
        continue;
      }
      accounts.push({
        igUserId: ig.id,
        username: ig.username || "",
        name: ig.name || ig.username || "Instagram account",
        profilePictureUrl: ig.profile_picture_url || "",
        followersCount: typeof ig.followers_count === "number" ? ig.followers_count : null,
        mediaCount: typeof ig.media_count === "number" ? ig.media_count : null,
        pageId: page.id,
        pageName: page.name || "Facebook Page",
        pageAccessToken,
        authProvider: "facebook",
      });
    } catch (error) {
      logMetaWarn("meta.facebook.page_instagram_fetch_failed", {
        pageId: page.id,
        pageName: page.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return accounts;
}

export function resolvePrivateAccess(input: { connectionId?: string; igUserId: string; accessToken?: string; authProvider?: string }) {
  if (input.accessToken) {
    return {
      accessToken: input.accessToken,
      authProvider: input.authProvider === "instagram" ? "instagram" : "facebook",
      account: null,
    } as const;
  }

  if (!input.connectionId) throw new MetaAppError("MISSING_CONNECTION", "Connect with Meta first, then request private insights.", 401);
  const connection = tokenStore.get(input.connectionId);
  if (!connection || connection.expiresAt < Date.now()) {
    tokenStore.delete(input.connectionId);
    throw new MetaAppError("CONNECTION_EXPIRED", "Your Meta connection expired for this prototype session. Please reconnect.", 401);
  }
  const account = connection.accounts.find((item) => item.igUserId === input.igUserId);
  if (!account) throw new MetaAppError("IG_ACCOUNT_NOT_IN_CONNECTION", "The selected Instagram account is not part of this Meta connection.", 403);
  return {
    accessToken: account.pageAccessToken || account.accessToken || connection.longLivedUserToken,
    authProvider: account.authProvider || connection.authProvider,
    account,
  } as const;
}

export function resolveConnectionAccount(connectionId: string, igUserId: string) {
  const connection = tokenStore.get(connectionId);
  if (!connection || connection.expiresAt < Date.now()) {
    tokenStore.delete(connectionId);
    throw new MetaAppError("CONNECTION_EXPIRED", "Your Meta connection expired for this prototype session. Please reconnect.", 401);
  }
  const account = connection.accounts.find((item) => item.igUserId === igUserId);
  if (!account) throw new MetaAppError("IG_ACCOUNT_NOT_IN_CONNECTION", "The selected Instagram account is not part of this Meta connection.", 403);
  return { connection, account };
}

function saveConnection(longLivedUserToken: string, accounts: ConnectedInstagramAccount[], authProvider: "instagram" | "facebook") {
  const connectionId = crypto.randomUUID();
  const expiresAt = Date.now() + CONNECTION_TTL_MS;
  tokenStore.set(connectionId, {
    longLivedUserToken,
    accounts,
    authProvider,
    createdAt: Date.now(),
    expiresAt,
  });
  recordMetaConnectedAccounts(accounts, { connectionExpiresAt: expiresAt, authProvider });
  cleanupExpiredConnections();
  return {
    connectionId,
    expiresInSeconds: Math.floor(CONNECTION_TTL_MS / 1000),
    accounts: accounts.map((account) => ({ ...account, accessToken: undefined, pageAccessToken: undefined })),
  };
}

function cleanupExpiredConnections() {
  const now = Date.now();
  for (const [connectionId, connection] of tokenStore.entries()) {
    if (connection.expiresAt < now) tokenStore.delete(connectionId);
  }
}

function cleanupExpiredOAuthStates() {
  const now = Date.now();
  for (const [state, record] of oauthStateStore.entries()) {
    if (record.expiresAt < now) oauthStateStore.delete(state);
  }
}
