import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicEstimate, buildPrivateAnalytics } from "./analyticsService.js";
import {
  getFrontendUrl,
  getMetaConfig,
  getPublicClientConfig,
  getSetupStatus,
  setDiscoverySource,
  updateRuntimeConfig,
} from "./configStore.js";
import { createMetaClient } from "./metaClient.js";
import { fetchPrivateMediaWithInsights } from "./insightService.js";
import {
  createRequestId,
  getLogFilePath,
  logError,
  logInfo,
  logWarn,
  readRecentLogs,
} from "./logger.js";
import {
  consumeOAuthState,
  createFacebookConnection,
  createFacebookConnectionFromLongLivedToken,
  createInstagramConnection,
  createOAuthState,
  diagnoseFacebookConnection,
  diagnoseInstagramConnection,
  resolveConnectionAccount,
  resolvePrivateAccess,
} from "./tokenService.js";
import { AppError, createStructuredError } from "./utils.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const app = express();
const port = Number(process.env.PORT || 3000);
const metaClient = createMetaClient();
const facebookDiagnosticStore = new Map();
const instagramDiagnosticStore = new Map();
const FACEBOOK_DIAGNOSTIC_TTL_MS = 30 * 60 * 1000;
const INSTAGRAM_DIAGNOSTIC_TTL_MS = 30 * 60 * 1000;

app.set("trust proxy", 1);

app.use(express.json({ limit: "200kb" }));
app.use((request, response, next) => {
  request.requestId = createRequestId();
  response.setHeader("X-Request-Id", request.requestId);

  if (request.path.startsWith("/api/")) {
    const startedAt = Date.now();
    logInfo("http.request.started", {
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      query: sanitizeQuery(request.query),
      origin: request.get("origin") || null,
      referer: request.get("referer") || null,
      userAgent: request.get("user-agent") || null,
      ip: request.ip,
    });

    response.on("finish", () => {
      logInfo("http.request.finished", {
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
  }

  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }
      logWarn("cors.rejected", { origin });
      return callback(new AppError("CORS_NOT_ALLOWED", "This origin is not allowed.", 403));
    },
    credentials: true,
  }),
);

app.use(express.static(publicDir));

const publicEstimatorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_request, response) {
    const error = new AppError(
      "PUBLIC_ESTIMATE_RATE_LIMITED",
      "Too many public estimates. Please wait a few minutes and try again.",
      429,
    );
    const structured = createStructuredError(error);
    response.status(structured.status).json(structured.payload);
  },
});

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

app.get("/api/config", (_request, response) => {
  response.json({
    success: true,
    data: getPublicClientConfig(getRequestBaseUrl(_request)),
  });
});

app.get("/api/setup/status", (_request, response) => {
  response.json({
    success: true,
    data: getSetupStatus(),
  });
});

app.get("/api/debug/logs", (request, response) => {
  assertDebugLogsAvailable();
  const lines = Number(request.query.lines || 200);
  response.json({
    success: true,
    data: {
      file: getLogFilePath(),
      entries: readRecentLogs(lines),
    },
  });
});

app.get(
  "/api/debug/facebook-diagnostic/start",
  asyncHandler(async (request, response) => {
    assertDebugLogsAvailable();
    const config = getMetaConfig();
    if (config.authMode !== "facebook") {
      throw new AppError(
        "FACEBOOK_DIAGNOSTIC_REQUIRES_FACEBOOK_MODE",
        "Facebook diagnostics require authMode=facebook.",
        400,
      );
    }
    if (!config.appId || !config.appSecret || !config.facebookLoginConfigId) {
      throw new AppError(
        "FACEBOOK_DIAGNOSTIC_CONFIGURATION_ERROR",
        "Facebook Login for Business is not fully configured.",
        503,
        "Configure App ID, App Secret, and Facebook Login for Business Configuration ID first.",
      );
    }

    const diagnosticId = sanitizeDiagnosticId(request.query.sessionId) || createRequestId();
    const requestBaseUrl = getRequestBaseUrl(request);
    const redirectUri = new URL("/api/auth/facebook/callback", requestBaseUrl).toString();
    const oauthState = createOAuthState({
      mode: "diagnostic",
      redirectUri,
      provider: "facebook",
      openerOrigin: requestBaseUrl,
      diagnosticId,
    });
    const dialogUrl = buildFacebookBusinessOAuthUrl({
      config,
      redirectUri,
      state: oauthState,
    });

    saveFacebookDiagnostic(diagnosticId, {
      id: diagnosticId,
      status: "started",
      startedAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null,
    });

    logInfo("diagnostic.facebook.redirect", {
      requestId: request.requestId,
      diagnosticId,
      requestBaseUrl,
      redirectUri,
      clientId: summarizePublicId(config.appId),
      hasConfigId: true,
      dialogHost: dialogUrl.host,
    });

    response.redirect(dialogUrl.toString());
  }),
);

app.get("/api/debug/facebook-diagnostic/latest", (request, response) => {
  assertDebugLogsAvailable();
  cleanupFacebookDiagnostics();
  const diagnosticId = sanitizeDiagnosticId(request.query.sessionId);
  const record = diagnosticId
    ? facebookDiagnosticStore.get(diagnosticId)
    : Array.from(facebookDiagnosticStore.values()).at(-1);

  if (!record) {
    return response.status(404).json({
      success: false,
      error: {
        code: "FACEBOOK_DIAGNOSTIC_NOT_FOUND",
        message: "No Facebook diagnostic result is available yet.",
        details: diagnosticId ? `No result for session ${diagnosticId}.` : "",
      },
    });
  }

  response.json({
    success: true,
    data: record,
  });
});

app.get(
  "/api/debug/instagram-diagnostic/start",
  asyncHandler(async (request, response) => {
    assertDebugLogsAvailable();
    const config = getMetaConfig();
    if (!config.appId || !config.appSecret) {
      throw new AppError(
        "INSTAGRAM_DIAGNOSTIC_CONFIGURATION_ERROR",
        "Instagram Login direct is not configured.",
        503,
        "Configure the Instagram App ID and Instagram App Secret from Instagram > API setup with Instagram login.",
      );
    }

    const diagnosticId = sanitizeDiagnosticId(request.query.sessionId) || createRequestId();
    const requestBaseUrl = getRequestBaseUrl(request);
    const redirectUri = new URL("/api/auth/instagram/callback", requestBaseUrl).toString();
    const oauthState = createOAuthState({
      mode: "diagnostic",
      redirectUri,
      provider: "instagram",
      openerOrigin: requestBaseUrl,
      diagnosticId,
    });
    const dialogUrl = buildInstagramOAuthUrl({
      config,
      redirectUri,
      state: oauthState,
    });

    saveInstagramDiagnostic(diagnosticId, {
      id: diagnosticId,
      status: "started",
      startedAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null,
    });

    logInfo("diagnostic.instagram.redirect", {
      requestId: request.requestId,
      diagnosticId,
      requestBaseUrl,
      redirectUri,
      clientId: summarizePublicId(config.appId),
      dialogHost: dialogUrl.host,
    });

    response.redirect(dialogUrl.toString());
  }),
);

app.get("/api/debug/instagram-diagnostic/latest", (request, response) => {
  assertDebugLogsAvailable();
  cleanupInstagramDiagnostics();
  const diagnosticId = sanitizeDiagnosticId(request.query.sessionId);
  const record = diagnosticId
    ? instagramDiagnosticStore.get(diagnosticId)
    : Array.from(instagramDiagnosticStore.values()).at(-1);

  if (!record) {
    return response.status(404).json({
      success: false,
      error: {
        code: "INSTAGRAM_DIAGNOSTIC_NOT_FOUND",
        message: "No Instagram diagnostic result is available yet.",
        details: diagnosticId ? `No result for session ${diagnosticId}.` : "",
      },
    });
  }

  response.json({
    success: true,
    data: record,
  });
});

app.post(
  "/api/setup/runtime-config",
  asyncHandler(async (request, response) => {
    const status = updateRuntimeConfig(request.body || {});
    logInfo("setup.runtime_config.saved", {
      requestId: request.requestId,
      status,
      body: {
        ...request.body,
        appSecret: request.body?.appSecret ? "[provided]" : "[not provided]",
      },
    });
    response.json({
      success: true,
      data: status,
    });
  }),
);

app.post(
  "/api/client-log",
  asyncHandler(async (request, response) => {
    const payload = normalizeClientLogPayload(request.body || {});
    const logPayload = {
      requestId: request.requestId,
      origin: request.get("origin") || null,
      referer: request.get("referer") || null,
      ...payload,
    };
    if (payload.level === "error") logError("client.event", logPayload);
    else if (payload.level === "warn") logWarn("client.event", logPayload);
    else logInfo("client.event", logPayload);
    response.json({ success: true });
  }),
);

app.post(
  "/api/setup/discovery-source",
  asyncHandler(async (request, response) => {
    const connectionId = String(request.body?.connectionId || "").trim();
    const igUserId = String(request.body?.igUserId || "").trim();
    if (!connectionId || !igUserId) {
      throw new AppError(
        "MISSING_DISCOVERY_SOURCE",
        "Choose a connected Instagram account first.",
        400,
      );
    }

    const { connection, account } = resolveConnectionAccount(connectionId, igUserId);
    const status = setDiscoverySource({
      igUserId: account.igUserId,
      token: account.pageAccessToken || account.accessToken || connection.longLivedUserToken,
      username: account.username,
    });
    logInfo("setup.discovery_source.saved", {
      requestId: request.requestId,
      igUserId,
      username: account.username,
      authProvider: account.authProvider || connection.authProvider || "facebook",
    });

    response.json({
      success: true,
      data: status,
    });
  }),
);

app.get(
  "/api/public-estimate",
  publicEstimatorLimiter,
  asyncHandler(async (request, response) => {
    logInfo("public_estimate.started", {
      requestId: request.requestId,
      username: request.query.username,
    });
    const data = await getPublicEstimate(metaClient, request.query.username);
    logInfo("public_estimate.succeeded", {
      requestId: request.requestId,
      username: data.profile.username,
      analyzedPosts: data.analyzed_posts_count,
      followers: data.profile.followers_count,
    });
    response.json({
      success: true,
      mock: metaClient.mock,
      data,
    });
  }),
);

app.post(
  "/api/auth/facebook",
  asyncHandler(async (request, response) => {
    logInfo("auth.facebook.token_received", {
      requestId: request.requestId,
      hasAccessToken: Boolean(request.body?.accessToken),
    });
    const connection = await createFacebookConnection(metaClient, request.body?.accessToken);
    logInfo("auth.facebook.connection_created", {
      requestId: request.requestId,
      accountCount: connection.accounts.length,
      accounts: summarizeAccounts(connection.accounts),
    });
    response.json({
      success: true,
      mock: metaClient.mock,
      data: connection,
    });
  }),
);

app.get(
  "/api/auth/facebook/start",
  asyncHandler(async (request, response) => {
    const config = getMetaConfig();
    if (config.authMode === "instagram") {
      return startInstagramOAuth(request, response);
    }

    const mode = String(request.query.mode || "private") === "discovery" ? "discovery" : "private";

    if (metaClient.mock) {
      const connection = await createFacebookConnection(metaClient, "mock-short-lived-user-token");
      logInfo("oauth.facebook.mock_success", {
        requestId: request.requestId,
        mode,
        accountCount: connection.accounts.length,
      });
      return response.type("html").send(buildOAuthPopupHtml({
        origin: getFrontendUrl(port),
        payload: {
          type: "META_AUTH_SUCCESS",
          mode,
          data: connection,
        },
      }));
    }

    if (!config.appId || !config.appSecret) {
      throw new AppError(
        "META_CONFIGURATION_ERROR",
        "Meta Login is not configured. Configure APP_ID and APP_SECRET first.",
        503,
      );
    }
    if (!config.facebookLoginConfigId) {
      throw new AppError(
        "FACEBOOK_BUSINESS_CONFIG_REQUIRED",
        "Facebook Login for Business needs a Configuration ID before the OAuth flow can start.",
        503,
        "In Meta Developers, open Facebook Login for Business > Configurations, create or open a configuration with the Instagram/Page permissions, then paste its Configuration ID into this prototype's Meta setup window.",
      );
    }

    const requestBaseUrl = getRequestBaseUrl(request);
    const redirectUri = new URL("/api/auth/facebook/callback", requestBaseUrl).toString();
    const oauthState = createOAuthState({
      mode,
      redirectUri,
      provider: "facebook",
      openerOrigin: requestBaseUrl,
    });
    const dialogUrl = buildFacebookBusinessOAuthUrl({
      config,
      redirectUri,
      state: oauthState,
    });

    logInfo("oauth.facebook.redirect", {
      requestId: request.requestId,
      mode,
      requestBaseUrl,
      redirectUri,
      graphApiVersion: config.graphApiVersion,
      clientId: summarizePublicId(config.appId),
      scopes: "[managed_by_business_login_configuration]",
      hasConfigId: Boolean(config.facebookLoginConfigId),
      dialogHost: dialogUrl.host,
    });

    return response.redirect(dialogUrl.toString());
  }),
);

app.get(
  "/api/auth/meta/start",
  asyncHandler(async (request, response) => {
    const config = getMetaConfig();
    if (config.authMode === "facebook") {
      return response.redirect(
        `/api/auth/facebook/start?mode=${encodeURIComponent(String(request.query.mode || "private"))}`,
      );
    }
    return startInstagramOAuth(request, response);
  }),
);

app.get(
  "/api/auth/facebook/callback",
  asyncHandler(async (request, response) => {
    const state = String(request.query.state || "");
    const code = String(request.query.code || "");
    const deniedError = request.query.error_message || request.query.error;
    let popupOrigin = getRequestBaseUrl(request);
    let oauthState = null;

    logInfo("oauth.facebook.callback.received", {
      requestId: request.requestId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      deniedError: deniedError || null,
      queryKeys: Object.keys(request.query || {}),
    });

    try {
      if (deniedError) {
        throw new AppError(
          "META_LOGIN_CANCELLED",
          "Meta Login was cancelled or denied.",
          401,
          String(deniedError),
        );
      }
      if (!code || !state) {
        throw new AppError(
          "INVALID_OAUTH_CALLBACK",
          "Meta Login did not return the expected authorization code.",
          400,
        );
      }

      oauthState = consumeOAuthState(state);
      popupOrigin = oauthState.openerOrigin || popupOrigin;
      const shortLived = await metaClient.exchangeAuthorizationCode(code, oauthState.redirectUri);
      const longLived = await metaClient.exchangeUserAccessToken(shortLived.access_token);

      if (oauthState.mode === "diagnostic") {
        const diagnostic = await diagnoseFacebookConnection(metaClient, longLived.access_token);
        saveFacebookDiagnostic(oauthState.diagnosticId, {
          id: oauthState.diagnosticId,
          status: "completed",
          startedAt: null,
          completedAt: new Date().toISOString(),
          result: diagnostic,
          error: null,
        });
        logInfo("diagnostic.facebook.completed", {
          requestId: request.requestId,
          diagnosticId: oauthState.diagnosticId,
          analysis: diagnostic.analysis,
          summary: diagnostic.summary,
        });
        return response.type("html").send(buildDiagnosticCompleteHtml({
          status: "completed",
          title: "Facebook diagnostic complete",
          message: "You can close this window and return to the terminal.",
          diagnosticId: oauthState.diagnosticId,
        }));
      }

      const connection = await createFacebookConnectionFromLongLivedToken(
        metaClient,
        longLived.access_token,
      );
      logInfo("oauth.facebook.callback.succeeded", {
        requestId: request.requestId,
        mode: oauthState.mode,
        accountCount: connection.accounts.length,
        accounts: summarizeAccounts(connection.accounts),
      });

      return response.type("html").send(buildOAuthPopupHtml({
        origin: popupOrigin,
        payload: {
          type: "META_AUTH_SUCCESS",
          mode: oauthState.mode,
          data: connection,
        },
      }));
    } catch (error) {
      logError("oauth.facebook.callback.failed", {
        requestId: request.requestId,
        code: error.code || "META_LOGIN_ERROR",
        message: error.message || "Meta Login failed.",
        details: error.details || null,
      });
      if (oauthState?.mode === "diagnostic") {
        saveFacebookDiagnostic(oauthState.diagnosticId, {
          id: oauthState.diagnosticId,
          status: "failed",
          startedAt: null,
          completedAt: new Date().toISOString(),
          result: null,
          error: {
            code: error.code || "META_LOGIN_ERROR",
            message: error.message || "Meta Login failed.",
            details: error.details || null,
          },
        });
        return response.type("html").send(buildDiagnosticCompleteHtml({
          status: "failed",
          title: "Facebook diagnostic failed",
          message: error.message || "Meta Login failed.",
          diagnosticId: oauthState.diagnosticId,
        }));
      }
      return response.type("html").send(buildOAuthPopupHtml({
        origin: popupOrigin,
        payload: {
          type: "META_AUTH_ERROR",
          error: {
            code: error.code || "META_LOGIN_ERROR",
            message: error.message || "Meta Login failed.",
            details: error.details || null,
          },
        },
      }));
    }
  }),
);

app.get(
  "/api/auth/instagram/callback",
  asyncHandler(async (request, response) => {
    const state = String(request.query.state || "");
    const code = String(request.query.code || "");
    const deniedError = request.query.error_reason || request.query.error_message || request.query.error;
    let popupOrigin = getRequestBaseUrl(request);
    let oauthState = null;

    logInfo("oauth.instagram.callback.received", {
      requestId: request.requestId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      deniedError: deniedError || null,
      queryKeys: Object.keys(request.query || {}),
    });

    try {
      if (deniedError) {
        throw new AppError(
          "INSTAGRAM_LOGIN_CANCELLED",
          "Instagram Login was cancelled or denied.",
          401,
          String(deniedError),
        );
      }
      if (!code || !state) {
        throw new AppError(
          "INVALID_INSTAGRAM_OAUTH_CALLBACK",
          "Instagram Login did not return the expected authorization code.",
          400,
        );
      }

      oauthState = consumeOAuthState(state);
      popupOrigin = oauthState.openerOrigin || popupOrigin;
      const shortLived = await metaClient.exchangeInstagramAuthorizationCode(code, oauthState.redirectUri);
      const longLived = await metaClient.exchangeInstagramLongLivedToken(shortLived.access_token);

      if (oauthState.mode === "diagnostic") {
        const diagnostic = await diagnoseInstagramConnection(metaClient, longLived.access_token, {
          ...shortLived,
          ...longLived,
        });
        saveInstagramDiagnostic(oauthState.diagnosticId, {
          id: oauthState.diagnosticId,
          status: "completed",
          startedAt: null,
          completedAt: new Date().toISOString(),
          result: diagnostic,
          error: null,
        });
        logInfo("diagnostic.instagram.completed", {
          requestId: request.requestId,
          diagnosticId: oauthState.diagnosticId,
          analysis: diagnostic.analysis,
          summary: diagnostic.summary,
        });
        return response.type("html").send(buildDiagnosticCompleteHtml({
          status: "completed",
          title: "Instagram diagnostic complete",
          message: "You can close this window and return to the terminal.",
          diagnosticId: oauthState.diagnosticId,
        }));
      }

      const connection = await createInstagramConnection(
        metaClient,
        longLived.access_token,
        shortLived,
      );
      logInfo("oauth.instagram.callback.succeeded", {
        requestId: request.requestId,
        mode: oauthState.mode,
        accountCount: connection.accounts.length,
        accounts: summarizeAccounts(connection.accounts),
      });

      return response.type("html").send(buildOAuthPopupHtml({
        origin: popupOrigin,
        payload: {
          type: "META_AUTH_SUCCESS",
          mode: oauthState.mode,
          data: connection,
        },
      }));
    } catch (error) {
      logError("oauth.instagram.callback.failed", {
        requestId: request.requestId,
        code: error.code || "INSTAGRAM_LOGIN_ERROR",
        message: error.message || "Instagram Login failed.",
        details: error.details || null,
      });
      if (oauthState?.mode === "diagnostic") {
        saveInstagramDiagnostic(oauthState.diagnosticId, {
          id: oauthState.diagnosticId,
          status: "failed",
          startedAt: null,
          completedAt: new Date().toISOString(),
          result: null,
          error: {
            code: error.code || "INSTAGRAM_LOGIN_ERROR",
            message: error.message || "Instagram Login failed.",
            details: error.details || null,
          },
        });
        return response.type("html").send(buildDiagnosticCompleteHtml({
          status: "failed",
          title: "Instagram diagnostic failed",
          message: error.message || "Instagram Login failed.",
          diagnosticId: oauthState.diagnosticId,
        }));
      }
      return response.type("html").send(buildOAuthPopupHtml({
        origin: popupOrigin,
        payload: {
          type: "META_AUTH_ERROR",
          error: {
            code: error.code || "INSTAGRAM_LOGIN_ERROR",
            message: error.message || "Instagram Login failed.",
            details: error.details || null,
          },
        },
      }));
    }
  }),
);

app.get(
  "/api/private-insights",
  asyncHandler(async (request, response) => {
    const igUserId = String(request.query.igUserId || "").trim();
    if (!igUserId) {
      throw new AppError("MISSING_IG_USER_ID", "Select an Instagram account first.", 400);
    }

    const privateAccess = resolvePrivateAccess({
      connectionId: String(request.query.connectionId || "").trim(),
      igUserId,
      // Supported for the requested endpoint shape, but the frontend uses
      // connectionId so long-lived user tokens stay server-side in memory.
      accessToken: String(request.query.accessToken || "").trim(),
      authProvider: String(request.query.authProvider || "").trim(),
    });

    logInfo("private_insights.started", {
      requestId: request.requestId,
      igUserId,
      connectionId: request.query.connectionId ? "[provided]" : "[missing]",
      hasDirectAccessToken: Boolean(request.query.accessToken),
      authProvider: privateAccess.authProvider,
    });

    const insightPayload = await fetchPrivateMediaWithInsights(
      metaClient,
      igUserId,
      privateAccess.accessToken,
      privateAccess.authProvider,
    );
    const analytics = buildPrivateAnalytics(insightPayload);

    logInfo("private_insights.succeeded", {
      requestId: request.requestId,
      igUserId,
      username: analytics.profile.username,
      mediaCount: analytics.media.length,
      warningCount: analytics.warnings.length,
      totalReach: analytics.overview.total_reach,
      totalImpressions: analytics.overview.total_impressions,
    });

    response.json({
      success: true,
      mock: metaClient.mock,
      data: analytics,
    });
  }),
);

app.use((request, response) => {
  const wantsApi = request.path.startsWith("/api/");
  if (wantsApi) {
    const error = new AppError("NOT_FOUND", "The requested API route does not exist.", 404);
    const structured = createStructuredError(error);
    return response.status(structured.status).json(structured.payload);
  }
  return response.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, _request, response, _next) => {
  logError("http.error", {
    requestId: _request?.requestId,
    method: _request?.method,
    path: _request?.path,
    code: error?.code,
    message: error?.message,
    status: error?.status,
    details: error?.details,
  });
  const structured = createStructuredError(error);
  response.status(structured.status).json(structured.payload);
});

app.listen(port, () => {
  logInfo("server.started", {
    port,
    mockMeta: metaClient.mock,
    logFile: getLogFilePath(),
  });
  console.log(`Instagram Analytics prototype running on http://localhost:${port}`);
  if (metaClient.mock) {
    console.log("MOCK_META=true. Meta API responses are mocked and clearly marked in the UI.");
  }
});

function buildFacebookBusinessOAuthUrl({ config, redirectUri, state }) {
  const dialogUrl = new URL(`https://www.facebook.com/${config.graphApiVersion}/dialog/oauth`);

  dialogUrl.searchParams.set("client_id", config.appId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("state", state);
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("override_default_response_type", "true");
  dialogUrl.searchParams.set("auth_type", "rerequest");
  dialogUrl.searchParams.set("config_id", config.facebookLoginConfigId);

  return dialogUrl;
}

function buildInstagramOAuthUrl({ config, redirectUri, state }) {
  const dialogUrl = new URL("https://www.instagram.com/oauth/authorize");

  dialogUrl.searchParams.set("enable_fb_login", "0");
  dialogUrl.searchParams.set("force_authentication", "1");
  dialogUrl.searchParams.set("client_id", config.appId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("state", state);
  dialogUrl.searchParams.set("scope", [
    "instagram_business_basic",
    "instagram_business_manage_insights",
  ].join(","));

  return dialogUrl;
}

function buildOAuthPopupHtml({ origin, payload }) {
  const safePayload = JSON.stringify(payload).replaceAll("<", "\\u003c");
  const safeOrigin = JSON.stringify(origin);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Meta Login</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 32px; color: #202124; }
      .box { border: 1px solid #e7e1d8; border-radius: 8px; padding: 20px; max-width: 520px; }
    </style>
  </head>
  <body>
    <div class="box">
      <strong>Meta Login complete.</strong>
      <p>You can close this window.</p>
    </div>
    <script>
      const payload = ${safePayload};
      if (window.opener) {
        window.opener.postMessage(payload, ${safeOrigin});
        window.close();
      }
    </script>
  </body>
</html>`;
}

function buildDiagnosticCompleteHtml({ status, title, message, diagnosticId }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 32px; color: #202124; }
      .box { border: 1px solid #e7e1d8; border-radius: 8px; padding: 20px; max-width: 640px; }
      .ok { color: #176b4d; }
      .failed { color: #9f2d20; }
      code { background: #f6f3ee; border-radius: 4px; padding: 2px 6px; }
    </style>
  </head>
  <body>
    <div class="box">
      <strong class="${status === "completed" ? "ok" : "failed"}">${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      <p>Diagnostic ID: <code>${escapeHtml(diagnosticId || "")}</code></p>
    </div>
  </body>
</html>`;
}

async function startInstagramOAuth(request, response) {
  const mode = String(request.query.mode || "private") === "discovery" ? "discovery" : "private";

  if (metaClient.mock) {
    const connection = await createInstagramConnection(
      metaClient,
      "mock-instagram-long-lived-token",
      { user_id: "mock-ig-1" },
    );
    logInfo("oauth.instagram.mock_success", {
      requestId: request.requestId,
      mode,
      accountCount: connection.accounts.length,
    });
    return response.type("html").send(buildOAuthPopupHtml({
      origin: getRequestBaseUrl(request),
      payload: {
        type: "META_AUTH_SUCCESS",
        mode,
        data: connection,
      },
    }));
  }

  const config = getMetaConfig();
  if (!config.appId || !config.appSecret) {
    throw new AppError(
      "META_CONFIGURATION_ERROR",
      "Instagram Login is not configured. Configure the Instagram App ID and Instagram App Secret first.",
      503,
      "Use the credentials from Instagram > API setup with Instagram login. The generic App settings > Basic credentials can break the Instagram OAuth page.",
    );
  }

  const requestBaseUrl = getRequestBaseUrl(request);
  const redirectUri = new URL("/api/auth/instagram/callback", requestBaseUrl).toString();
  const oauthState = createOAuthState({
    mode,
    redirectUri,
    provider: "instagram",
    openerOrigin: requestBaseUrl,
  });
  const dialogUrl = buildInstagramOAuthUrl({
    config,
    redirectUri,
    state: oauthState,
  });

  logInfo("oauth.instagram.redirect", {
    requestId: request.requestId,
    mode,
    requestBaseUrl,
    redirectUri,
    graphApiVersion: config.graphApiVersion,
    clientId: summarizePublicId(config.appId),
    scopes: ["instagram_business_basic", "instagram_business_manage_insights"],
    dialogHost: dialogUrl.host,
    forceAuthentication: true,
    enableFbLogin: false,
    authorizeUrl: redactOAuthUrl(dialogUrl),
  });

  return response.redirect(dialogUrl.toString());
}

function getRequestBaseUrl(request) {
  const forwardedProto = String(request.get("x-forwarded-proto") || "").split(",")[0].trim();
  const proto = forwardedProto || request.protocol || "http";
  const host = request.get("x-forwarded-host") || request.get("host");

  if (host) {
    return `${proto}://${host}`;
  }

  return getFrontendUrl(port);
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;

  const configuredFrontendUrl = getFrontendUrl(port);
  if (origin === configuredFrontendUrl) return true;

  if (process.env.NODE_ENV === "production") return false;

  try {
    const url = new URL(origin);
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const isCloudflareTunnel = url.hostname.endsWith(".trycloudflare.com");
    const isLocalTunnel = url.hostname.endsWith(".loca.lt");

    return isLocalhost || isCloudflareTunnel || isLocalTunnel;
  } catch {
    return false;
  }
}

function normalizeClientLogPayload(input) {
  const event = String(input.event || "client.unknown").trim().slice(0, 120);
  const level = ["info", "warn", "error"].includes(input.level) ? input.level : "info";
  const sessionId = String(input.sessionId || "").trim().slice(0, 120);
  return {
    level,
    clientEvent: event,
    sessionId,
    url: String(input.url || "").slice(0, 500),
    data: input.data || {},
  };
}

function summarizeAccounts(accounts = []) {
  return accounts.map((account) => ({
    igUserId: account.igUserId,
    username: account.username,
    pageName: account.pageName,
    authProvider: account.authProvider || "facebook",
    followersCount: account.followersCount,
    mediaCount: account.mediaCount,
  }));
}

function summarizePublicId(value) {
  const text = String(value || "");
  if (!text) return "";
  return {
    length: text.length,
    last4: text.slice(-4),
  };
}

function sanitizeQuery(query = {}) {
  const output = {};
  for (const [key, value] of Object.entries(query)) {
    if (["code", "state"].includes(key)) {
      output[key] = value ? "[redacted]" : "";
    } else {
      output[key] = value;
    }
  }
  return output;
}

function sanitizeDiagnosticId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function saveFacebookDiagnostic(id, record) {
  cleanupFacebookDiagnostics();
  const diagnosticId = sanitizeDiagnosticId(id) || createRequestId();
  facebookDiagnosticStore.set(diagnosticId, {
    ...record,
    id: diagnosticId,
    expiresAt: Date.now() + FACEBOOK_DIAGNOSTIC_TTL_MS,
  });
}

function saveInstagramDiagnostic(id, record) {
  cleanupInstagramDiagnostics();
  const diagnosticId = sanitizeDiagnosticId(id) || createRequestId();
  instagramDiagnosticStore.set(diagnosticId, {
    ...record,
    id: diagnosticId,
    expiresAt: Date.now() + INSTAGRAM_DIAGNOSTIC_TTL_MS,
  });
}

function cleanupFacebookDiagnostics() {
  const now = Date.now();
  for (const [id, record] of facebookDiagnosticStore.entries()) {
    if (!record?.expiresAt || record.expiresAt < now) {
      facebookDiagnosticStore.delete(id);
    }
  }
}

function cleanupInstagramDiagnostics() {
  const now = Date.now();
  for (const [id, record] of instagramDiagnosticStore.entries()) {
    if (!record?.expiresAt || record.expiresAt < now) {
      instagramDiagnosticStore.delete(id);
    }
  }
}

function redactOAuthUrl(url) {
  const copy = new URL(url.toString());
  if (copy.searchParams.has("state")) copy.searchParams.set("state", "[redacted]");
  if (copy.searchParams.has("code")) copy.searchParams.set("code", "[redacted]");
  if (copy.searchParams.has("client_secret")) copy.searchParams.set("client_secret", "[redacted]");
  return copy.toString();
}

function assertDebugLogsAvailable() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEBUG_LOGS !== "true") {
    throw new AppError(
      "DEBUG_LOGS_DISABLED",
      "Debug logs are disabled in production.",
      403,
    );
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
