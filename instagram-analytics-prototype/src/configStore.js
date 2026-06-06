import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./utils.js";

const DEFAULT_GRAPH_API_VERSION = "v23.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localRuntimeConfigPath = process.env.RUNTIME_CONFIG_FILE
  ? path.resolve(process.env.RUNTIME_CONFIG_FILE)
  : path.resolve(__dirname, "../../data/instagram/runtime-config.local.json");
const persistedRuntimeConfig = readPersistedRuntimeConfig();

const runtimeConfig = {
  appId: process.env.APP_ID || persistedRuntimeConfig.appId || "",
  appSecret: process.env.APP_SECRET || persistedRuntimeConfig.appSecret || "",
  graphApiVersion:
    process.env.GRAPH_API_VERSION ||
    persistedRuntimeConfig.graphApiVersion ||
    DEFAULT_GRAPH_API_VERSION,
  authMode: process.env.META_AUTH_MODE || persistedRuntimeConfig.authMode || "instagram",
  facebookLoginConfigId:
    process.env.FACEBOOK_LOGIN_CONFIG_ID || persistedRuntimeConfig.facebookLoginConfigId || "",
  myInstagramBusinessId: process.env.MY_INSTAGRAM_BUSINESS_ID || "",
  myLongLivedAccessToken: process.env.MY_LONG_LIVED_ACCESS_TOKEN || "",
  frontendUrl: process.env.FRONTEND_URL || persistedRuntimeConfig.frontendUrl || "",
  mockMeta: String(process.env.MOCK_META || "false").toLowerCase() === "true",
  discoverySourceUsername: "",
};

export function getMetaConfig() {
  return { ...runtimeConfig };
}

export function getSetupStatus() {
  const publicDiscoveryConfigured =
    runtimeConfig.mockMeta ||
    Boolean(runtimeConfig.myInstagramBusinessId && runtimeConfig.myLongLivedAccessToken);
  const metaCredentialsConfigured = Boolean(runtimeConfig.appId && runtimeConfig.appSecret);
  const facebookLoginConfigured =
    runtimeConfig.mockMeta ||
    (runtimeConfig.authMode === "facebook"
      ? Boolean(metaCredentialsConfigured && runtimeConfig.facebookLoginConfigId)
      : metaCredentialsConfigured);

  return {
    mockMeta: runtimeConfig.mockMeta,
    graphApiVersion: runtimeConfig.graphApiVersion,
    authMode: runtimeConfig.authMode,
    facebookLoginConfigId: runtimeConfig.facebookLoginConfigId,
    facebookLoginConfigured,
    metaCredentialsConfigured,
    publicDiscoveryConfigured,
    hasAppId: Boolean(runtimeConfig.appId),
    hasAppSecret: Boolean(runtimeConfig.appSecret),
    hasDiscoverySource: Boolean(runtimeConfig.myInstagramBusinessId),
    discoverySourceUsername: runtimeConfig.discoverySourceUsername,
    localAppConfigSaved: Boolean(runtimeConfig.appId),
    runtimeSetupAvailable: isRuntimeSetupAvailable(),
  };
}

export function getPublicClientConfig(frontendUrl = "") {
  const status = getSetupStatus();
  return {
    appId: runtimeConfig.appId,
    graphApiVersion: runtimeConfig.graphApiVersion,
    mockMeta: runtimeConfig.mockMeta,
    frontendUrl,
    oauthCallbackUrl: frontendUrl
      ? new URL(
          runtimeConfig.authMode === "facebook"
            ? "/api/auth/facebook/callback"
            : "/api/auth/instagram/callback",
          frontendUrl,
        ).toString()
      : "",
    facebookCallbackUrl: frontendUrl
      ? new URL("/api/auth/facebook/callback", frontendUrl).toString()
      : "",
    instagramCallbackUrl: frontendUrl
      ? new URL("/api/auth/instagram/callback", frontendUrl).toString()
      : "",
    setup: status,
  };
}

export function updateRuntimeConfig(input) {
  assertRuntimeSetupAvailable();

  const next = {
    appId: hasOwn(input, "appId") ? cleanString(input.appId) : runtimeConfig.appId,
    appSecret: hasOwn(input, "appSecret")
      ? cleanString(input.appSecret)
      : runtimeConfig.appSecret,
    graphApiVersion: hasOwn(input, "graphApiVersion")
      ? cleanGraphVersion(input.graphApiVersion || DEFAULT_GRAPH_API_VERSION)
      : runtimeConfig.graphApiVersion,
    authMode: hasOwn(input, "authMode")
      ? cleanAuthMode(input.authMode)
      : runtimeConfig.authMode,
    facebookLoginConfigId: hasOwn(input, "facebookLoginConfigId")
      ? cleanString(input.facebookLoginConfigId)
      : runtimeConfig.facebookLoginConfigId,
    frontendUrl: hasOwn(input, "frontendUrl")
      ? cleanFrontendUrl(input.frontendUrl)
      : runtimeConfig.frontendUrl,
    mockMeta: Boolean(input.mockMeta),
  };

  runtimeConfig.appId = next.appId;
  runtimeConfig.appSecret = next.appSecret;
  runtimeConfig.graphApiVersion = next.graphApiVersion;
  runtimeConfig.authMode = next.authMode;
  runtimeConfig.facebookLoginConfigId = next.facebookLoginConfigId;
  runtimeConfig.frontendUrl = next.frontendUrl;
  runtimeConfig.mockMeta = next.mockMeta;

  persistLocalRuntimeConfig();

  return getSetupStatus();
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

export function setDiscoverySource({ igUserId, token, username }) {
  assertRuntimeSetupAvailable();

  runtimeConfig.myInstagramBusinessId = cleanString(igUserId);
  runtimeConfig.myLongLivedAccessToken = cleanString(token);
  runtimeConfig.discoverySourceUsername = cleanString(username);

  return getSetupStatus();
}

export function getFrontendUrl(port) {
  return runtimeConfig.frontendUrl || `http://localhost:${port}`;
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanGraphVersion(value) {
  const graphVersion = cleanString(value);
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    throw new AppError(
      "INVALID_GRAPH_VERSION",
      "Graph API version must look like v23.0.",
      400,
    );
  }
  return graphVersion;
}

function cleanAuthMode(value) {
  const authMode = cleanString(value) || "instagram";
  if (!["instagram", "facebook"].includes(authMode)) {
    throw new AppError(
      "INVALID_AUTH_MODE",
      "Auth mode must be instagram or facebook.",
      400,
    );
  }
  return authMode;
}

function cleanFrontendUrl(value) {
  const frontendUrl = cleanString(value);
  if (!frontendUrl) return "";

  try {
    const url = new URL(frontendUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
    return url.origin;
  } catch {
    throw new AppError(
      "INVALID_FRONTEND_URL",
      "Frontend URL must be a valid http or https URL.",
      400,
    );
  }
}

function isRuntimeSetupAvailable() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_RUNTIME_SETUP === "true";
}

function assertRuntimeSetupAvailable() {
  if (!isRuntimeSetupAvailable()) {
    throw new AppError(
      "RUNTIME_SETUP_DISABLED",
      "Runtime setup is disabled in production. Use environment variables or a secret manager.",
      403,
    );
  }
}

function readPersistedRuntimeConfig() {
  try {
    if (!fs.existsSync(localRuntimeConfigPath)) return {};
    const raw = fs.readFileSync(localRuntimeConfigPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      appId: cleanString(parsed.appId),
      appSecret: cleanString(parsed.appSecret),
      graphApiVersion: parsed.graphApiVersion
        ? cleanGraphVersion(parsed.graphApiVersion)
        : DEFAULT_GRAPH_API_VERSION,
      authMode: cleanAuthMode(parsed.authMode || "instagram"),
      facebookLoginConfigId: cleanString(parsed.facebookLoginConfigId),
      frontendUrl: parsed.frontendUrl ? cleanFrontendUrl(parsed.frontendUrl) : "",
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
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(localRuntimeConfigPath), { recursive: true });
    fs.writeFileSync(localRuntimeConfigPath, `${JSON.stringify(payload, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (error) {
    throw new AppError(
      "LOCAL_CONFIG_SAVE_FAILED",
      "Meta app credentials could not be saved locally.",
      500,
      error?.message || String(error),
    );
  }
}
