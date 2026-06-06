import { getMetaConfig } from "./configStore";
import { MetaAppError, metaResponseToAppError } from "./utils";
import type { MetaAuthProvider } from "./types";

type JsonRecord = Record<string, unknown>;

export class MetaClient {
  get graphApiVersion() {
    return getMetaConfig().graphApiVersion;
  }

  get mock() {
    return getMetaConfig().mockMeta;
  }

  async graphGet(path: string, params: Record<string, string | number | boolean> = {}, accessToken?: string) {
    if (!accessToken) {
      throw new MetaAppError("MISSING_ACCESS_TOKEN", "A Meta access token is required for this request.", 500);
    }
    const url = new URL(`https://graph.facebook.com/${this.graphApiVersion}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    url.searchParams.set("access_token", accessToken);
    return fetchJson(url, undefined, "Meta Graph API request failed.");
  }

  async exchangeFacebookAuthorizationCode(code: string, redirectUri: string) {
    if (this.mock) return { access_token: "mock-facebook-short-token", token_type: "bearer", expires_in: 3600 };
    const { appId, appSecret } = getMetaConfig();
    if (!appId || !appSecret) {
      throw new MetaAppError("META_CONFIGURATION_ERROR", "Facebook Login is not configured. Add APP_ID and APP_SECRET.", 503);
    }
    const url = new URL(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    return fetchJson(url, undefined, "Could not exchange the Facebook authorization code.");
  }

  async exchangeFacebookLongLivedToken(shortLivedAccessToken: string) {
    if (this.mock) return { access_token: "mock-facebook-long-token", token_type: "bearer", expires_in: 60 * 60 * 24 * 60 };
    const { appId, appSecret } = getMetaConfig();
    if (!appId || !appSecret) {
      throw new MetaAppError("META_CONFIGURATION_ERROR", "Facebook Login is not configured. Add APP_ID and APP_SECRET.", 503);
    }
    const url = new URL(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedAccessToken);
    return fetchJson(url, undefined, "Could not exchange the Facebook access token for a long-lived token.");
  }

  async exchangeInstagramAuthorizationCode(code: string, redirectUri: string) {
    if (this.mock) return { access_token: "mock-instagram-short-token", user_id: "mock-ig-1" };
    const { appId, appSecret } = getMetaConfig();
    if (!appId || !appSecret) {
      throw new MetaAppError("META_CONFIGURATION_ERROR", "Instagram Login is not configured. Add Instagram App ID and App Secret.", 503);
    }
    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    return fetchJson("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }, "Could not exchange the Instagram authorization code.");
  }

  async exchangeInstagramLongLivedToken(shortLivedAccessToken: string) {
    if (this.mock) return { access_token: "mock-instagram-long-token", token_type: "bearer", expires_in: 60 * 60 * 24 * 60 };
    const { appSecret } = getMetaConfig();
    if (!appSecret) throw new MetaAppError("META_CONFIGURATION_ERROR", "Instagram App Secret is missing.", 503);
    const url = new URL("https://graph.instagram.com/access_token");
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("access_token", shortLivedAccessToken);
    return fetchJson(url, undefined, "Could not create a long-lived Instagram token.");
  }

  async fetchPages(longLivedUserToken: string) {
    if (this.mock) {
      return {
        data: [
          { id: "mock-page-1", name: "Aura Demo Page", access_token: "mock-page-token-1", tasks: ["MANAGE"] },
          { id: "mock-page-2", name: "Creator Studio Page", access_token: "mock-page-token-2", tasks: ["MANAGE"] },
        ],
      };
    }
    return this.graphGet("/me/accounts", { fields: "id,name,access_token,tasks", limit: 100 }, longLivedUserToken);
  }

  async debugFacebookToken(inputToken: string) {
    if (this.mock) {
      return {
        data: {
          app_id: "mock-app",
          type: "USER",
          application: "Mock Meta App",
          is_valid: true,
          scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"],
          granular_scopes: [],
        },
      };
    }
    const { appId, appSecret } = getMetaConfig();
    if (!appId || !appSecret) throw new MetaAppError("META_CONFIGURATION_ERROR", "APP_ID and APP_SECRET are required to debug tokens.", 503);
    const url = new URL(`https://graph.facebook.com/${this.graphApiVersion}/debug_token`);
    url.searchParams.set("input_token", inputToken);
    url.searchParams.set("access_token", `${appId}|${appSecret}`);
    return fetchJson(url, undefined, "Could not debug the Facebook access token.");
  }

  async fetchPageInstagramAccount(pageId: string, accessToken: string) {
    if (this.mock) return mockPageInstagramAccount(pageId);
    return this.graphGet(
      `/${pageId}`,
      { fields: "instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}" },
      accessToken,
    );
  }

  async fetchInstagramProfile(igUserId: string, accessToken: string, authProvider: MetaAuthProvider = "facebook") {
    if (this.mock) return mockInstagramProfile(igUserId);
    if (authProvider === "instagram") {
      const url = new URL(`https://graph.instagram.com/${this.graphApiVersion}/me`);
      url.searchParams.set("fields", "user_id,username,name,account_type,profile_picture_url,followers_count,media_count");
      url.searchParams.set("access_token", accessToken);
      const data = await fetchJson(url, undefined, "Could not fetch the connected Instagram profile.");
      return {
        id: String(data.user_id || data.id || igUserId),
        username: String(data.username || ""),
        name: String(data.name || data.username || ""),
        profile_picture_url: String(data.profile_picture_url || ""),
        followers_count: Number(data.followers_count || 0),
        media_count: Number(data.media_count || 0),
        account_type: String(data.account_type || ""),
      };
    }
    return this.graphGet(`/${igUserId}`, { fields: "id,username,name,profile_picture_url,followers_count,media_count" }, accessToken);
  }

  async fetchInstagramMedia(igUserId: string, accessToken: string, limit = 10, authProvider: MetaAuthProvider = "facebook") {
    if (this.mock) return mockPrivateMedia();
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
    if (authProvider === "instagram") {
      const url = new URL(`https://graph.instagram.com/${this.graphApiVersion}/me/media`);
      url.searchParams.set("fields", fields);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("access_token", accessToken);
      return fetchJson(url, undefined, "Could not fetch the connected Instagram media.");
    }
    return this.graphGet(`/${igUserId}/media`, { fields, limit }, accessToken);
  }

  async fetchMediaInsights(mediaId: string, metrics: string[] | string, accessToken: string, authProvider: MetaAuthProvider = "facebook") {
    if (this.mock) return mockMediaInsights(mediaId, metrics);
    const metric = Array.isArray(metrics) ? metrics.join(",") : metrics;
    if (authProvider === "instagram") {
      const url = new URL(`https://graph.instagram.com/${this.graphApiVersion}/${mediaId}/insights`);
      url.searchParams.set("metric", metric);
      url.searchParams.set("access_token", accessToken);
      return fetchJson(url, undefined, "Could not fetch Instagram media insights.");
    }
    return this.graphGet(`/${mediaId}/insights`, { metric }, accessToken);
  }
}

export function createMetaClient() {
  return new MetaClient();
}

async function fetchJson(url: URL | string, init: RequestInit | undefined, fallbackMessage: string): Promise<JsonRecord> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch (error) {
    throw new MetaAppError("META_NETWORK_ERROR", "Meta API is temporarily unreachable.", 502, error instanceof Error ? error.message : String(error));
  }
  const payload = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok || payload.error || payload.error_message) {
    throw metaResponseToAppError(payload, response.status, fallbackMessage);
  }
  return payload;
}

function mockPageInstagramAccount(pageId: string) {
  const accounts: Record<string, JsonRecord> = {
    "mock-page-1": {
      id: "mock-ig-1",
      username: "aura.demo",
      name: "Aura Demo Creator",
      profile_picture_url: "",
      followers_count: 24800,
      media_count: 438,
    },
    "mock-page-2": {
      id: "mock-ig-2",
      username: "creator.studio",
      name: "Creator Studio",
      profile_picture_url: "",
      followers_count: 8900,
      media_count: 126,
    },
  };
  return { id: pageId, instagram_business_account: accounts[pageId] || accounts["mock-page-1"] };
}

function mockInstagramProfile(igUserId: string) {
  const account = mockPageInstagramAccount(igUserId === "mock-ig-2" ? "mock-page-2" : "mock-page-1").instagram_business_account as JsonRecord;
  return { ...account, account_type: "CREATOR" };
}

function mockPrivateMedia() {
  const now = Date.now();
  return {
    data: Array.from({ length: 10 }).map((_, index) => ({
      id: `mock-private-media-${index + 1}`,
      caption: index % 3 === 0 ? "Save this checklist for your next launch." : "Behind the scenes, lessons learned, and a question for the community.",
      media_type: index % 4 === 0 ? "CAROUSEL_ALBUM" : index % 2 === 0 ? "VIDEO" : "IMAGE",
      media_url: "",
      thumbnail_url: "",
      permalink: "https://www.instagram.com/",
      timestamp: new Date(now - index * 2 * 24 * 60 * 60 * 1000).toISOString(),
      like_count: 640 - index * 29,
      comments_count: 48 - index * 2,
    })),
  };
}

function mockMediaInsights(mediaId: string, metrics: string[] | string) {
  const index = Number(String(mediaId).match(/\d+$/)?.[0] || 1);
  const metricNames = Array.isArray(metrics) ? metrics : String(metrics).split(",");
  const values: Record<string, number> = {
    impressions: 9600 - index * 410,
    reach: 7100 - index * 280,
    saved: 260 - index * 13,
  };
  return {
    data: metricNames.map((metric) => ({
      name: metric,
      period: "lifetime",
      values: [{ value: Math.max(0, values[metric] ?? 0) }],
    })),
  };
}
