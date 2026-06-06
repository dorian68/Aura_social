export type MetaAuthMode = "instagram" | "facebook";
export type MetaAuthProvider = MetaAuthMode;

export type MetaRuntimeConfig = {
  appId: string;
  appSecret: string;
  graphApiVersion: string;
  authMode: MetaAuthMode;
  facebookLoginConfigId: string;
  frontendUrl: string;
  mockMeta: boolean;
  discoverySourceIgUserId: string;
  discoverySourceToken: string;
  discoverySourceUsername: string;
};

export type MetaSetupStatus = {
  mockMeta: boolean;
  graphApiVersion: string;
  authMode: MetaAuthMode;
  facebookLoginConfigId: string;
  metaCredentialsConfigured: boolean;
  facebookLoginConfigured: boolean;
  publicDiscoveryConfigured: boolean;
  hasAppId: boolean;
  hasAppSecret: boolean;
  hasDiscoverySource: boolean;
  discoverySourceUsername: string;
  runtimeSetupAvailable: boolean;
};

export type ConnectedInstagramAccount = {
  igUserId: string;
  username: string;
  name: string;
  profilePictureUrl: string;
  followersCount: number | null;
  mediaCount: number | null;
  pageId: string | null;
  pageName: string;
  pageAccessToken?: string;
  accessToken?: string;
  authProvider: MetaAuthProvider;
};

export type MetaConnection = {
  connectionId: string;
  expiresInSeconds: number;
  accounts: ConnectedInstagramAccount[];
};

export type StoredMetaConnection = {
  longLivedUserToken: string;
  accounts: ConnectedInstagramAccount[];
  authProvider: MetaAuthProvider;
  createdAt: number;
  expiresAt: number;
};

export type OAuthStateRecord = {
  provider: MetaAuthProvider;
  mode: "private" | "discovery" | "diagnostic";
  redirectUri: string;
  openerOrigin: string;
  diagnosticId?: string;
  createdAt: number;
  expiresAt: number;
};

export type MetaMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export type MediaInsightWarning = {
  mediaId: string;
  metric: string;
  code: string;
  status: number | null;
  metaSubcode: number | null;
  reason: string;
  message: string;
};

export type PrivateMediaWithInsights = {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  insights: Record<string, number>;
  unavailableMetrics: string[];
};

export type PrivateInsightsPayload = {
  profile: {
    id: string;
    username: string;
    name: string;
    profile_picture_url: string;
    followers_count: number;
    media_count: number;
  };
  media: PrivateMediaWithInsights[];
  warnings: MediaInsightWarning[];
};
