import type {
  CreatorAnalysisInput,
  CreatorPostInput,
  CreatorPostType,
} from "@/lib/analytics/types";
import {
  InstagramProviderError,
  type InstagramDataProvider,
} from "@/lib/providers/instagram/types";
import { getMetaConfig } from "@/lib/meta/configStore";

type GraphError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

type GraphMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
};

type GraphBusinessDiscovery = {
  username?: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
  media?: {
    data?: GraphMedia[];
  };
};

type BusinessDiscoveryResponse = GraphError & {
  business_discovery?: GraphBusinessDiscovery;
};

const DEFAULT_GRAPH_VERSION = "v23.0";
const DISCOVERY_MEDIA_LIMIT = 20;

function sanitizeUsername(username: string) {
  const sanitized = username.trim().replace(/^@+/, "");
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(sanitized)) {
    throw new InstagramProviderError("Saisissez un username Instagram valide.", "PROFILE_NOT_FOUND");
  }
  return sanitized;
}

function getConfig() {
  const metaConfig = getMetaConfig();
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || metaConfig.discoverySourceToken;
  const igUserId = process.env.INSTAGRAM_IG_USER_ID || metaConfig.discoverySourceIgUserId;
  const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION || metaConfig.graphApiVersion || DEFAULT_GRAPH_VERSION;

  if (!accessToken || !igUserId) {
    throw new InstagramProviderError(
      "Instagram Graph API n'est pas configure. Connectez une source Business/Creator dans le dashboard ou ajoutez INSTAGRAM_ACCESS_TOKEN et INSTAGRAM_IG_USER_ID cote serveur.",
      "CONFIGURATION_ERROR",
    );
  }

  return { accessToken, igUserId, graphVersion };
}

async function graphGet<T>(
  graphVersion: string,
  path: string,
  accessToken: string,
  params: Record<string, string>,
) {
  const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, value);
  endpoint.searchParams.set("access_token", accessToken);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new InstagramProviderError("Instagram Graph API est temporairement inaccessible.", "PROVIDER_ERROR");
  }

  const payload = (await response.json().catch(() => ({}))) as T & GraphError;
  if (!response.ok || payload.error) {
    throw new InstagramProviderError(
      normalizeGraphErrorMessage(payload.error),
      response.status === 404 ? "PROFILE_NOT_FOUND" : "PROVIDER_ERROR",
    );
  }

  return payload;
}

function normalizeGraphErrorMessage(error: GraphError["error"]) {
  if (!error?.message) {
    return "Le compte Instagram ne peut pas etre analyse via l'API officielle Meta.";
  }

  return [
    "Meta Graph API a refuse la requete.",
    "Le compte peut etre prive, personnel, indisponible, non professionnel, ou non accessible avec les permissions actuelles.",
    `Message Meta: ${error.message}`,
  ].join(" ");
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function mapMediaType(media: GraphMedia): CreatorPostType {
  const type = `${media.media_type || ""} ${media.media_product_type || ""}`.toUpperCase();
  if (type.includes("CAROUSEL")) return "Carousel";
  if (type.includes("VIDEO") || type.includes("REELS")) return "Reel";
  return "Image";
}

function mapPost(media: GraphMedia, index: number): CreatorPostInput {
  return {
    id: media.id || `graph_media_${index + 1}`,
    type: mapMediaType(media),
    likes: safeNumber(media.like_count),
    comments: safeNumber(media.comments_count),
    saves: 0,
    shares: 0,
    views: undefined,
    publishedAt: media.timestamp || new Date().toISOString(),
    caption: (media.caption || "").slice(0, 180),
    highIntentComments: 0,
  };
}

function mapBusinessDiscoveryToCreatorInput(profile: GraphBusinessDiscovery): CreatorAnalysisInput {
  const posts = (profile.media?.data || []).slice(0, DISCOVERY_MEDIA_LIMIT).map(mapPost);
  const followers = safeNumber(profile.followers_count);
  const username = profile.username || "";

  if (!username || followers <= 0) {
    throw new InstagramProviderError(
      "Le profil Instagram est introuvable, prive ou non supporte par l'API officielle Meta.",
      "PROFILE_NOT_FOUND",
    );
  }

  return {
    username: `@${username.replace(/^@+/, "")}`,
    followers,
    postsAnalyzed: posts.length,
    averageLikes: average(posts.map((post) => post.likes)),
    averageComments: average(posts.map((post) => post.comments)),
    averageShares: 0,
    averageSaves: 0,
    averageReelViews: 0,
    bioLinkClicks: 0,
    estimatedDMs: 0,
    niche: "Other",
    goal: "vendre une communauté privée",
    posts,
  };
}

export const instagramGraphProvider: InstagramDataProvider = {
  id: "instagram-graph-business-discovery",
  async collect(username) {
    const sanitizedUsername = sanitizeUsername(username);
    const metaConfig = getMetaConfig();
    if (metaConfig.mockMeta) {
      return mapBusinessDiscoveryToCreatorInput(buildMockBusinessDiscovery(sanitizedUsername));
    }
    const { accessToken, igUserId, graphVersion } = getConfig();
    const fields = [
      `business_discovery.username(${sanitizedUsername}){`,
      "username,name,followers_count,media_count,",
      `media.limit(${DISCOVERY_MEDIA_LIMIT}){id,caption,media_type,media_product_type,like_count,comments_count,timestamp}`,
      "}",
    ].join("");

    const payload = await graphGet<BusinessDiscoveryResponse>(
      graphVersion,
      igUserId,
      accessToken,
      { fields },
    );

    if (!payload.business_discovery) {
      throw new InstagramProviderError(
        "Meta n'a retourne aucune donnee Business Discovery pour ce compte. Il peut etre prive, personnel, indisponible ou non supporte.",
        "PROFILE_NOT_FOUND",
      );
    }

    return mapBusinessDiscoveryToCreatorInput(payload.business_discovery);
  },
};

function buildMockBusinessDiscovery(username: string): GraphBusinessDiscovery {
  const now = Date.now();
  const mediaTypes = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM", "IMAGE", "VIDEO", "IMAGE"];
  return {
    username,
    name: `@${username} demo`,
    followers_count: 24800,
    media_count: 438,
    media: {
      data: Array.from({ length: 12 }).map((_, index) => ({
        id: `mock-public-media-${index + 1}`,
        caption:
          index % 4 === 0
            ? ""
            : `Mock campaign post ${index + 1} with useful creator notes and a clear CTA.`,
        media_type: mediaTypes[index % mediaTypes.length],
        media_product_type: mediaTypes[index % mediaTypes.length] === "VIDEO" ? "REELS" : undefined,
        like_count: Math.max(90, 720 - index * 37 + (index % 3) * 45),
        comments_count: Math.max(6, 58 - index * 3 + (index % 2) * 8),
        timestamp: new Date(now - index * 2.4 * 24 * 60 * 60 * 1000).toISOString(),
      })),
    },
  };
}
