import axios from "axios";
import { AppError, metaErrorToAppError } from "./utils.js";
import { getMetaConfig } from "./configStore.js";

export class MetaClient {
  constructor() {
    this.http = axios.create({ timeout: 15000 });
    this.instagramHttp = axios.create({
      baseURL: "https://graph.instagram.com",
      timeout: 15000,
    });
  }

  get graphApiVersion() {
    return getMetaConfig().graphApiVersion;
  }

  get mock() {
    return getMetaConfig().mockMeta;
  }

  async get(path, params = {}, accessToken) {
    if (!accessToken) {
      throw new AppError(
        "MISSING_ACCESS_TOKEN",
        "A Meta access token is required for this request.",
        500,
      );
    }

    try {
      const cleanPath = path.replace(/^\/+/, "");
      const response = await this.http.get(
        `https://graph.facebook.com/${this.graphApiVersion}/${cleanPath}`,
        {
        params: {
          ...params,
          access_token: accessToken,
        },
        },
      );
      return response.data;
    } catch (error) {
      throw metaErrorToAppError(error);
    }
  }

  async fetchBusinessDiscovery(username) {
    if (this.mock) return mockBusinessDiscovery(username);

    const { myInstagramBusinessId: igBusinessId, myLongLivedAccessToken: token } =
      getMetaConfig();

    if (!igBusinessId || !token) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Business Discovery is not configured. Add MY_INSTAGRAM_BUSINESS_ID and MY_LONG_LIVED_ACCESS_TOKEN.",
        503,
      );
    }

    const fields =
      `business_discovery.username(${username})` +
      "{username,name,profile_picture_url,followers_count,media_count," +
      "media.limit(12){id,caption,media_type,like_count,comments_count,timestamp,permalink}}";

    return this.get(`/${igBusinessId}`, { fields }, token);
  }

  async exchangeUserAccessToken(shortLivedAccessToken) {
    if (this.mock) {
      return {
        access_token: "mock-long-lived-user-token",
        token_type: "bearer",
        expires_in: 60 * 60 * 24 * 60,
      };
    }

    const { appId, appSecret } = getMetaConfig();

    if (!appId || !appSecret) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Facebook Login is not configured. Add APP_ID and APP_SECRET.",
        503,
      );
    }

    try {
      const response = await this.http.get(
        `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`,
        {
        params: {
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedAccessToken,
        },
        },
      );
      return response.data;
    } catch (error) {
      throw metaErrorToAppError(
        error,
        "Could not exchange the Facebook access token for a long-lived token.",
      );
    }
  }

  async exchangeAuthorizationCode(code, redirectUri) {
    if (this.mock) {
      return {
        access_token: "mock-short-lived-user-token",
        token_type: "bearer",
        expires_in: 60 * 60,
      };
    }

    const { appId, appSecret } = getMetaConfig();

    if (!appId || !appSecret) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Facebook Login is not configured. Add APP_ID and APP_SECRET.",
        503,
      );
    }

    try {
      const response = await this.http.get(
        `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`,
        {
          params: {
            client_id: appId,
            client_secret: appSecret,
            redirect_uri: redirectUri,
            code,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw metaErrorToAppError(error, "Could not exchange the Facebook authorization code.");
    }
  }

  async exchangeInstagramAuthorizationCode(code, redirectUri) {
    if (this.mock) {
      return {
        access_token: "mock-instagram-short-lived-token",
        user_id: "mock-ig-1",
      };
    }

    const { appId, appSecret } = getMetaConfig();
    if (!appId || !appSecret) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Instagram Login is not configured. Add the Instagram App ID and Instagram App Secret.",
        503,
      );
    }

    try {
      const body = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      });
      const response = await axios.post("https://api.instagram.com/oauth/access_token", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      throw metaErrorToAppError(error, "Could not exchange the Instagram authorization code.");
    }
  }

  async exchangeInstagramLongLivedToken(shortLivedAccessToken) {
    if (this.mock) {
      return {
        access_token: "mock-instagram-long-lived-token",
        token_type: "bearer",
        expires_in: 60 * 60 * 24 * 60,
      };
    }

    const { appSecret } = getMetaConfig();
    if (!appSecret) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Instagram Login is not configured. Add the Instagram App Secret.",
        503,
      );
    }

    const params = {
      grant_type: "ig_exchange_token",
      client_secret: appSecret,
      access_token: shortLivedAccessToken,
    };

    try {
      const response = await this.instagramHttp.get("/access_token", { params });
      return response.data;
    } catch (getError) {
      try {
        const body = new URLSearchParams(params);
        const response = await this.instagramHttp.post("/access_token", body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data;
      } catch (postError) {
        throw metaErrorToAppError(postError, "Could not create a long-lived Instagram token.");
      }
    }
  }

  async fetchPages(longLivedUserToken) {
    if (this.mock) {
      return {
        data: [
          {
            id: "mock-page-1",
            name: "Acme Studio",
            access_token: "mock-page-token-1",
          },
          {
            id: "mock-page-2",
            name: "Northstar Creator",
            access_token: "mock-page-token-2",
          },
        ],
      };
    }

    return this.get(
      "/me/accounts",
      {
        fields: "id,name,access_token,tasks",
        limit: 100,
      },
      longLivedUserToken,
    );
  }

  async debugToken(inputToken) {
    if (this.mock) {
      return {
        data: {
          app_id: "mock-app",
          type: "USER",
          application: "Mock Meta App",
          is_valid: true,
          scopes: [
            "instagram_basic",
            "instagram_manage_insights",
            "pages_show_list",
            "pages_read_engagement",
          ],
          granular_scopes: [],
        },
      };
    }

    const { appId, appSecret } = getMetaConfig();
    if (!appId || !appSecret) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Facebook Login is not configured. Add APP_ID and APP_SECRET.",
        503,
      );
    }

    try {
      const response = await this.http.get(
        `https://graph.facebook.com/${this.graphApiVersion}/debug_token`,
        {
          params: {
            input_token: inputToken,
            access_token: `${appId}|${appSecret}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw metaErrorToAppError(error, "Could not debug the Facebook access token.");
    }
  }

  async fetchPageInstagramAccount(pageId, accessToken) {
    if (this.mock) return mockPageInstagramAccount(pageId);

    return this.get(
      `/${pageId}`,
      {
        fields:
          "instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}",
      },
      accessToken,
    );
  }

  async fetchInstagramProfile(igUserId, accessToken, authProvider = "facebook") {
    if (this.mock) return mockInstagramProfile(igUserId);

    if (authProvider === "instagram") {
      try {
        const response = await this.instagramHttp.get(`/${this.graphApiVersion}/me`, {
          params: {
            fields:
              "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
            access_token: accessToken,
          },
        });
        return {
          id: response.data.user_id || response.data.id || igUserId,
          username: response.data.username || "",
          name: response.data.name || response.data.username || "",
          profile_picture_url: response.data.profile_picture_url || "",
          followers_count: response.data.followers_count || 0,
          media_count: response.data.media_count || 0,
          account_type: response.data.account_type || "",
        };
      } catch (error) {
        throw metaErrorToAppError(error, "Could not fetch the connected Instagram profile.");
      }
    }

    return this.get(
      `/${igUserId}`,
      {
        fields: "id,username,name,profile_picture_url,followers_count,media_count",
      },
      accessToken,
    );
  }

  async fetchInstagramMedia(igUserId, accessToken, limit = 10, authProvider = "facebook") {
    if (this.mock) return mockPrivateMedia();

    if (authProvider === "instagram") {
      try {
        const response = await this.instagramHttp.get(`/${this.graphApiVersion}/me/media`, {
          params: {
            fields:
              "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
            limit,
            access_token: accessToken,
          },
        });
        return response.data;
      } catch (error) {
        throw metaErrorToAppError(error, "Could not fetch the connected Instagram media.");
      }
    }

    return this.get(
      `/${igUserId}/media`,
      {
        fields:
          "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
        limit,
      },
      accessToken,
    );
  }

  async fetchMediaInsights(mediaId, metrics, accessToken, authProvider = "facebook") {
    if (this.mock) return mockMediaInsights(mediaId, metrics);

    if (authProvider === "instagram") {
      try {
        const response = await this.instagramHttp.get(
          `/${this.graphApiVersion}/${mediaId}/insights`,
          {
            params: {
              metric: Array.isArray(metrics) ? metrics.join(",") : metrics,
              access_token: accessToken,
            },
          },
        );
        return response.data;
      } catch (error) {
        throw metaErrorToAppError(error, "Could not fetch Instagram media insights.");
      }
    }

    return this.get(
      `/${mediaId}/insights`,
      {
        metric: Array.isArray(metrics) ? metrics.join(",") : metrics,
      },
      accessToken,
    );
  }
}

export function createMetaClient() {
  return new MetaClient();
}

function mockBusinessDiscovery(username) {
  const now = Date.now();
  const mediaTypes = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM", "IMAGE", "VIDEO", "IMAGE"];
  const media = Array.from({ length: 12 }).map((_, index) => {
    const likes = 720 - index * 37 + (index % 3) * 45;
    const comments = 58 - index * 3 + (index % 2) * 8;
    return {
      id: `mock-public-media-${index + 1}`,
      caption:
        index % 4 === 0
          ? ""
          : `Mock campaign post ${index + 1} with useful creator notes and a clear CTA.`,
      media_type: mediaTypes[index % mediaTypes.length],
      like_count: Math.max(90, likes),
      comments_count: Math.max(6, comments),
      timestamp: new Date(now - index * 2.4 * 24 * 60 * 60 * 1000).toISOString(),
      permalink: "https://www.instagram.com/",
    };
  });

  return {
    business_discovery: {
      username,
      name: `@${username} demo`,
      profile_picture_url: "",
      followers_count: 24800,
      media_count: 438,
      media: { data: media },
    },
  };
}

function mockPageInstagramAccount(pageId) {
  const accounts = {
    "mock-page-1": {
      id: "mock-ig-1",
      username: "acmestudio",
      name: "Acme Studio",
      profile_picture_url: "",
      followers_count: 24800,
      media_count: 438,
    },
    "mock-page-2": {
      id: "mock-ig-2",
      username: "northstarcreator",
      name: "Northstar Creator",
      profile_picture_url: "",
      followers_count: 8900,
      media_count: 126,
    },
  };

  return {
    id: pageId,
    instagram_business_account: accounts[pageId] || accounts["mock-page-1"],
  };
}

function mockInstagramProfile(igUserId) {
  const pageAccount = mockPageInstagramAccount(igUserId === "mock-ig-2" ? "mock-page-2" : "mock-page-1");
  return pageAccount.instagram_business_account;
}

function mockPrivateMedia() {
  const now = Date.now();
  return {
    data: Array.from({ length: 10 }).map((_, index) => ({
      id: `mock-private-media-${index + 1}`,
      caption:
        index % 3 === 0
          ? "Save this checklist for your next launch."
          : "Behind the scenes, lessons learned, and a question for the community.",
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

function mockMediaInsights(mediaId, metrics) {
  const index = Number(String(mediaId).match(/\d+$/)?.[0] || 1);
  const metricNames = Array.isArray(metrics) ? metrics : String(metrics).split(",");

  const values = {
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
