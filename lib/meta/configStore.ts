import fs from "node:fs";
import path from "node:path";
import { MetaAppError } from "./utils";
import type { MetaAuthMode, MetaRuntimeConfig } from "./types";

const DEFAULT_GRAPH_API_VERSION = "v23.0";
const localRuntimeConfigPath = process.env.META_RUNTIME_CONFIG_FILE
  ? path.resolve(process.env.META_RUNTIME_CONFIG_FILE)
  : path.resolve(process.cwd(), "data/meta/runtime-config.local.json");

const persisted = readPersistedRuntimeConfig();

// Single process-wide config object. Under `next dev` this module is evaluated
// separately per route bundle; without globalThis pinning, each route gets its
// own copy, so a runtime update (mockMeta, frontendUrl, appId…) made through one
// route is invisible to the others (e.g. mock toggled but /auth/meta/start still
// runs live). Pinning on globalThis keeps one shared, mutable config everywhere.
const globalForMetaConfig = globalThis as typeof globalThis & { __auraMetaRuntimeConfig?: MetaRuntimeConfig };
const runtimeConfig: MetaRuntimeConfig = (globalForMetaConfig.__auraMetaRuntimeConfig ??= {
  appId: process.env.APP_ID || persisted.appId || "",
  appSecret: process.env.APP_SECRET || persisted.appSecret || "",
  graphApiVersion: process.env.GRAPH_API_VERSION || persisted.graphApiVersion || DEFAULT_GRAPH_API_VERSION,
  authMode: (process.env.META_AUTH_MODE as MetaAuthMode) || persisted.authMode || "instagram",
  facebookLoginConfigId: process.env.FACEBOOK_LOGIN_CONFIG_ID || persisted.facebookLoginConfigId || "",
  frontendUrl: process.env.FRONTEND_URL || persisted.frontendUrl || "",
  mockMeta: String(process.env.MOCK_META || persisted.mockMeta || "false").toLowerCase() === "true",
  discoverySourceIgUserId: process.env.INSTAGRAM_IG_USER_ID || persisted.discoverySourceIgUserId || "",
  discoverySourceToken: process.env.INSTAGRAM_ACCESS_TOKEN || persisted.discoverySourceToken || "",
  discoverySourceUsername: persisted.discoverySourceUsername || "",
});

export function getMetaConfig() {
  return { ...runtimeConfig };
}

export function getMetaSetupStatus() {
  const metaCredentialsConfigured = Boolean(runtimeConfig.appId && runtimeConfig.appSecret);
  const facebookLoginConfigured =
    runtimeConfig.mockMeta ||
    (runtimeConfig.authMode === "facebook"
      ? Boolean(metaCredentialsConfigured && runtimeConfig.facebookLoginConfigId)
      : metaCredentialsConfigured);
  const publicDiscoveryConfigured = runtimeConfig.mockMeta || Boolean(runtimeConfig.discoverySourceIgUserId && runtimeConfig.discoverySourceToken);

  return {
    mockMeta: runtimeConfig.mockMeta,
    graphApiVersion: runtimeConfig.graphApiVersion,
    authMode: runtimeConfig.authMode,
    facebookLoginConfigId: runtimeConfig.facebookLoginConfigId,
    metaCredentialsConfigured,
    facebookLoginConfigured,
    publicDiscoveryConfigured,
    hasAppId: Boolean(runtimeConfig.appId),
    hasAppSecret: Boolean(runtimeConfig.appSecret),
    hasDiscoverySource: Boolean(runtimeConfig.discoverySourceIgUserId),
    discoverySourceUsername: runtimeConfig.discoverySourceUsername,
    runtimeSetupAvailable: isRuntimeSetupAvailable(),
  };
}

export function getPublicMetaClientConfig(frontendUrl = "") {
  return {
    appId: runtimeConfig.appId,
    graphApiVersion: runtimeConfig.graphApiVersion,
    mockMeta: runtimeConfig.mockMeta,
    frontendUrl,
    oauthCallbackUrl: frontendUrl
      ? new URL(runtimeConfig.authMode === "facebook" ? "/api/auth/facebook/callback" : "/api/auth/instagram/callback", frontendUrl).toString()
      : "",
    facebookCallbackUrl: frontendUrl ? new URL("/api/auth/facebook/callback", frontendUrl).toString() : "",
    instagramCallbackUrl: frontendUrl ? new URL("/api/auth/instagram/callback", frontendUrl).toString() : "",
    setup: getMetaSetupStatus(),
  };
}

export function updateMetaRuntimeConfig(input: Record<string, unknown>) {
  assertRuntimeSetupAvailable();
  if (hasOwn(input, "appId")) runtimeConfig.appId = cleanString(input.appId);
  if (hasOwn(input, "appSecret")) runtimeConfig.appSecret = cleanString(input.appSecret) || runtimeConfig.appSecret;
  if (hasOwn(input, "graphApiVersion")) runtimeConfig.graphApiVersion = cleanGraphVersion(input.graphApiVersion || DEFAULT_GRAPH_API_VERSION);
  if (hasOwn(input, "authMode")) runtimeConfig.authMode = cleanAuthMode(input.authMode);
  if (hasOwn(input, "facebookLoginConfigId")) runtimeConfig.facebookLoginConfigId = cleanString(input.facebookLoginConfigId);
  if (hasOwn(input, "frontendUrl")) runtimeConfig.frontendUrl = cleanFrontendUrl(input.frontendUrl);
  if (hasOwn(input, "mockMeta")) runtimeConfig.mockMeta = Boolean(input.mockMeta);
  persistLocalRuntimeConfig();
  return getMetaSetupStatus();
}

export function setMetaDiscoverySource(input: { igUserId: string; token: string; username?: string }) {
  assertRuntimeSetupAvailable();
  runtimeConfig.discoverySourceIgUserId = cleanString(input.igUserId);
  runtimeConfig.discoverySourceToken = cleanString(input.token);
  runtimeConfig.discoverySourceUsername = cleanString(input.username);
  persistLocalRuntimeConfig();
  return getMetaSetupStatus();
}

export function getMetaFrontendUrl(fallbackPort = 3170) {
  return runtimeConfig.frontendUrl || `http://localhost:${fallbackPort}`;
}

function readPersistedRuntimeConfig(): Partial<MetaRuntimeConfig> {
  try {
    if (!fs.existsSync(localRuntimeConfigPath)) return {};
    const parsed = JSON.parse(fs.readFileSync(localRuntimeConfigPath, "utf8")) as Partial<MetaRuntimeConfig>;
    return {
      appId: cleanString(parsed.appId),
      appSecret: cleanString(parsed.appSecret),
      graphApiVersion: parsed.graphApiVersion ? cleanGraphVersion(parsed.graphApiVersion) : DEFAULT_GRAPH_API_VERSION,
      authMode: cleanAuthMode(parsed.authMode || "instagram"),
      facebookLoginConfigId: cleanString(parsed.facebookLoginConfigId),
      frontendUrl: parsed.frontendUrl ? cleanFrontendUrl(parsed.frontendUrl) : "",
      mockMeta: Boolean(parsed.mockMeta),
      discoverySourceIgUserId: cleanString(parsed.discoverySourceIgUserId),
      discoverySourceToken: cleanString(parsed.discoverySourceToken),
      discoverySourceUsername: cleanString(parsed.discoverySourceUsername),
    };
  } catch {
    return {};
  }
}

function persistLocalRuntimeConfig() {
  if (!isRuntimeSetupAvailable()) return;
  const payload = {
    appId: runtimeConfig.appId,
    appSecret: runtimeConfig.appSecret,
    graphApiVersion: runtimeConfig.graphApiVersion,
    authMode: runtimeConfig.authMode,
    facebookLoginConfigId: runtimeConfig.facebookLoginConfigId,
    frontendUrl: runtimeConfig.frontendUrl,
    mockMeta: runtimeConfig.mockMeta,
    discoverySourceIgUserId: runtimeConfig.discoverySourceIgUserId,
    discoverySourceToken: runtimeConfig.discoverySourceToken,
    discoverySourceUsername: runtimeConfig.discoverySourceUsername,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(localRuntimeConfigPath), { recursive: true });
  fs.writeFileSync(localRuntimeConfigPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function hasOwn(source: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanGraphVersion(value: unknown) {
  const version = cleanString(value);
  if (!/^v\d+\.\d+$/.test(version)) throw new MetaAppError("INVALID_GRAPH_VERSION", "Graph API version must look like v23.0.", 400);
  return version;
}

function cleanAuthMode(value: unknown): MetaAuthMode {
  const mode = cleanString(value) || "instagram";
  if (mode !== "instagram" && mode !== "facebook") throw new MetaAppError("INVALID_AUTH_MODE", "Auth mode must be instagram or facebook.", 400);
  return mode;
}

function cleanFrontendUrl(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
    return url.origin;
  } catch {
    throw new MetaAppError("INVALID_FRONTEND_URL", "Frontend URL must be a valid http or https URL.", 400);
  }
}

function isRuntimeSetupAvailable() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_RUNTIME_SETUP === "true";
}

function assertRuntimeSetupAvailable() {
  if (!isRuntimeSetupAvailable()) {
    throw new MetaAppError("RUNTIME_SETUP_DISABLED", "Runtime setup is disabled in production. Use environment variables or a secret manager.", 403);
  }
}
