import crypto from "node:crypto";
import { logInfo, logWarn } from "./logger.js";
import { AppError } from "./utils.js";

const tokenStore = new Map();
const oauthStateStore = new Map();
const STORE_TTL_MS = 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export async function createFacebookConnection(metaClient, shortLivedAccessToken) {
  if (!shortLivedAccessToken) {
    throw new AppError("MISSING_FACEBOOK_TOKEN", "A Facebook access token is required.", 400);
  }

  const exchanged = await metaClient.exchangeUserAccessToken(shortLivedAccessToken);
  return createFacebookConnectionFromLongLivedToken(metaClient, exchanged.access_token);
}

export async function createFacebookConnectionFromLongLivedToken(metaClient, longLivedUserToken) {
  const accounts = await findConnectedInstagramAccounts(metaClient, longLivedUserToken);

  if (!accounts.length) {
    throw new AppError(
      "NO_INSTAGRAM_BUSINESS_ACCOUNTS",
      "No connected Instagram Business or Creator accounts were found for this Facebook user.",
      404,
      "Make sure the Instagram account is professional and linked to a Facebook Page you manage.",
    );
  }

  const connectionId = crypto.randomUUID();

  // Prototype-only in-memory storage. Replace this with encrypted database storage
  // keyed by the authenticated SaaS user before moving beyond local prototyping.
  tokenStore.set(connectionId, {
    longLivedUserToken,
    accounts,
    createdAt: Date.now(),
    expiresAt: Date.now() + STORE_TTL_MS,
  });

  cleanupExpiredConnections();

  return {
    connectionId,
    expiresInSeconds: Math.floor(STORE_TTL_MS / 1000),
    accounts,
  };
}

export async function createInstagramConnection(metaClient, accessToken, tokenDetails = {}) {
  const profile = await metaClient.fetchInstagramProfile(
    tokenDetails.user_id || "me",
    accessToken,
    "instagram",
  );

  const account = {
    igUserId: profile.id || tokenDetails.user_id || "me",
    username: profile.username || "",
    name: profile.name || profile.username || "Instagram account",
    profilePictureUrl: profile.profile_picture_url || "",
    followersCount: profile.followers_count || null,
    mediaCount: profile.media_count || null,
    pageId: null,
    pageName: "Instagram Login",
    accessToken,
    authProvider: "instagram",
  };

  const connectionId = crypto.randomUUID();

  tokenStore.set(connectionId, {
    longLivedUserToken: accessToken,
    accounts: [account],
    authProvider: "instagram",
    createdAt: Date.now(),
    expiresAt: Date.now() + STORE_TTL_MS,
  });

  cleanupExpiredConnections();

  return {
    connectionId,
    expiresInSeconds: Math.floor(STORE_TTL_MS / 1000),
    accounts: [account],
  };
}

export function createOAuthState(payload) {
  cleanupExpiredOAuthStates();
  const state = crypto.randomUUID();
  oauthStateStore.set(state, {
    ...payload,
    createdAt: Date.now(),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  });
  return state;
}

export function consumeOAuthState(state) {
  const record = oauthStateStore.get(state);
  oauthStateStore.delete(state);

  if (!record || record.expiresAt < Date.now()) {
    throw new AppError(
      "OAUTH_STATE_EXPIRED",
      "The Meta Login session expired. Please try again.",
      401,
    );
  }

  return record;
}

export async function findConnectedInstagramAccounts(metaClient, longLivedUserToken) {
  const pagesResponse = await metaClient.fetchPages(longLivedUserToken);
  const pages = Array.isArray(pagesResponse?.data) ? pagesResponse.data : [];
  const accounts = [];

  logInfo("facebook.pages.fetched", {
    pageCount: pages.length,
    pages: pages.map((page) => ({
      id: page.id,
      name: page.name,
      hasAccessToken: Boolean(page.access_token),
      tasks: page.tasks || [],
    })),
  });

  for (const page of pages) {
    try {
      const pageAccessToken = page.access_token || longLivedUserToken;
      const pageDetails = await metaClient.fetchPageInstagramAccount(page.id, pageAccessToken);
      const igAccount = pageDetails?.instagram_business_account;

      if (igAccount?.id) {
        logInfo("facebook.page.instagram_found", {
          pageId: page.id,
          pageName: page.name,
          igUserId: igAccount.id,
          username: igAccount.username,
        });
        accounts.push({
          igUserId: igAccount.id,
          username: igAccount.username || "",
          name: igAccount.name || igAccount.username || "Instagram account",
          profilePictureUrl: igAccount.profile_picture_url || "",
          followersCount: igAccount.followers_count || null,
          mediaCount: igAccount.media_count || null,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken,
        });
      } else {
        logWarn("facebook.page.instagram_missing", {
          pageId: page.id,
          pageName: page.name,
          responseKeys: Object.keys(pageDetails || {}),
        });
      }
    } catch (error) {
      // One Page can fail because it lacks a linked IG account or the user has
      // partial permissions. Keep looking at the rest of the user's Pages.
      logWarn("facebook.page.instagram_fetch_failed", {
        pageId: page.id,
        pageName: page.name,
        error: toDiagnosticError(error),
      });
    }
  }

  return accounts;
}

export async function diagnoseFacebookConnection(metaClient, longLivedUserToken) {
  const diagnostic = {
    provider: "facebook",
    checkedAt: new Date().toISOString(),
    user: null,
    token: null,
    pagesResponse: null,
    pages: [],
    instagramAccounts: [],
    errors: [],
    summary: {
      tokenValid: null,
      scopes: [],
      granularScopes: [],
      pageCount: 0,
      pagesWithPageAccessToken: 0,
      pagesWithInstagramBusinessAccount: 0,
      pageInstagramLookupFailures: 0,
    },
  };

  const userResult = await safeDiagnosticCall(() =>
    metaClient.get("/me", { fields: "id,name" }, longLivedUserToken),
  );
  if (userResult.ok) {
    diagnostic.user = userResult.data;
  } else {
    diagnostic.errors.push({ step: "fetch_user", error: userResult.error });
  }

  const tokenResult = await safeDiagnosticCall(() => metaClient.debugToken(longLivedUserToken));
  if (tokenResult.ok) {
    const tokenData = tokenResult.data?.data || {};
    diagnostic.token = {
      app_id: tokenData.app_id || "",
      type: tokenData.type || "",
      application: tokenData.application || "",
      expires_at: tokenData.expires_at || 0,
      data_access_expires_at: tokenData.data_access_expires_at || 0,
      is_valid: Boolean(tokenData.is_valid),
      scopes: tokenData.scopes || [],
      granular_scopes: normalizeGranularScopes(tokenData.granular_scopes || []),
    };
    diagnostic.summary.tokenValid = diagnostic.token.is_valid;
    diagnostic.summary.scopes = diagnostic.token.scopes;
    diagnostic.summary.granularScopes = diagnostic.token.granular_scopes;
  } else {
    diagnostic.errors.push({ step: "debug_token", error: tokenResult.error });
  }

  const pagesResult = await safeDiagnosticCall(() => metaClient.fetchPages(longLivedUserToken));
  if (!pagesResult.ok) {
    diagnostic.errors.push({ step: "fetch_pages", error: pagesResult.error });
    return finalizeFacebookDiagnostic(diagnostic);
  }

  const pages = Array.isArray(pagesResult.data?.data) ? pagesResult.data.data : [];
  diagnostic.pagesResponse = {
    count: pages.length,
    paging: pagesResult.data?.paging ? "present" : "absent",
  };
  diagnostic.summary.pageCount = pages.length;

  for (const page of pages) {
    const pageAccessToken = page.access_token || longLivedUserToken;
    const pageDiagnostic = {
      id: page.id || "",
      name: page.name || "",
      tasks: page.tasks || [],
      hasPageAccessToken: Boolean(page.access_token),
      instagramBusinessAccount: null,
      error: null,
    };

    if (pageDiagnostic.hasPageAccessToken) {
      diagnostic.summary.pagesWithPageAccessToken += 1;
    }

    const igResult = await safeDiagnosticCall(() =>
      metaClient.fetchPageInstagramAccount(page.id, pageAccessToken),
    );

    if (igResult.ok) {
      const igAccount = igResult.data?.instagram_business_account || null;
      if (igAccount?.id) {
        pageDiagnostic.instagramBusinessAccount = {
          id: igAccount.id,
          username: igAccount.username || "",
          name: igAccount.name || "",
          followers_count: igAccount.followers_count || 0,
          media_count: igAccount.media_count || 0,
        };
        diagnostic.instagramAccounts.push({
          ...pageDiagnostic.instagramBusinessAccount,
          pageId: pageDiagnostic.id,
          pageName: pageDiagnostic.name,
        });
        diagnostic.summary.pagesWithInstagramBusinessAccount += 1;
      }
    } else {
      diagnostic.summary.pageInstagramLookupFailures += 1;
      pageDiagnostic.error = igResult.error;
    }

    diagnostic.pages.push(pageDiagnostic);
  }

  return finalizeFacebookDiagnostic(diagnostic);
}

export async function diagnoseInstagramConnection(metaClient, longLivedInstagramToken, tokenDetails = {}) {
  const diagnostic = {
    provider: "instagram",
    checkedAt: new Date().toISOString(),
    token: {
      hasLongLivedToken: Boolean(longLivedInstagramToken),
      tokenType: tokenDetails.token_type || "bearer",
      expiresIn: tokenDetails.expires_in || null,
      userId: tokenDetails.user_id || null,
    },
    profile: null,
    mediaProbe: null,
    insightProbe: null,
    errors: [],
    summary: {
      profileAvailable: false,
      accountType: "",
      followersCount: null,
      mediaCount: null,
      mediaReturned: 0,
      firstMediaId: "",
      insightMetricsAvailable: [],
      insightMetricsUnavailable: [],
    },
  };

  const profileResult = await safeDiagnosticCall(() =>
    metaClient.fetchInstagramProfile(tokenDetails.user_id || "me", longLivedInstagramToken, "instagram"),
  );
  if (profileResult.ok) {
    diagnostic.profile = profileResult.data;
    diagnostic.summary.profileAvailable = true;
    diagnostic.summary.accountType = profileResult.data.account_type || "";
    diagnostic.summary.followersCount = profileResult.data.followers_count ?? null;
    diagnostic.summary.mediaCount = profileResult.data.media_count ?? null;
  } else {
    diagnostic.errors.push({ step: "fetch_instagram_profile", error: profileResult.error });
    return finalizeInstagramDiagnostic(diagnostic);
  }

  const mediaResult = await safeDiagnosticCall(() =>
    metaClient.fetchInstagramMedia(tokenDetails.user_id || "me", longLivedInstagramToken, 5, "instagram"),
  );
  if (!mediaResult.ok) {
    diagnostic.errors.push({ step: "fetch_instagram_media", error: mediaResult.error });
    return finalizeInstagramDiagnostic(diagnostic);
  }

  const media = Array.isArray(mediaResult.data?.data) ? mediaResult.data.data : [];
  diagnostic.mediaProbe = {
    count: media.length,
    items: media.map((item) => ({
      id: item.id || "",
      media_type: item.media_type || "",
      timestamp: item.timestamp || "",
      like_count: item.like_count || 0,
      comments_count: item.comments_count || 0,
      has_permalink: Boolean(item.permalink),
    })),
  };
  diagnostic.summary.mediaReturned = media.length;

  const firstMedia = media[0];
  if (!firstMedia?.id) {
    return finalizeInstagramDiagnostic(diagnostic);
  }

  diagnostic.summary.firstMediaId = firstMedia.id;
  const metrics = ["impressions", "reach", "saved"];
  const insightProbe = {
    mediaId: firstMedia.id,
    metrics: {},
    unavailableMetrics: [],
  };

  for (const metric of metrics) {
    const metricResult = await safeDiagnosticCall(() =>
      metaClient.fetchMediaInsights(firstMedia.id, metric, longLivedInstagramToken, "instagram"),
    );
    if (metricResult.ok) {
      insightProbe.metrics[metric] = metricResult.data;
      diagnostic.summary.insightMetricsAvailable.push(metric);
    } else {
      insightProbe.unavailableMetrics.push({
        metric,
        error: metricResult.error,
      });
      diagnostic.summary.insightMetricsUnavailable.push(metric);
    }
  }

  diagnostic.insightProbe = insightProbe;
  return finalizeInstagramDiagnostic(diagnostic);
}

export function resolvePrivateAccess({ connectionId, igUserId, accessToken, authProvider }) {
  if (accessToken) {
    return {
      accessToken,
      authProvider: authProvider === "instagram" ? "instagram" : "facebook",
      account: null,
    };
  }

  if (!connectionId) {
    throw new AppError(
      "MISSING_CONNECTION",
      "Connect with Meta first, then request private insights.",
      401,
    );
  }

  const connection = tokenStore.get(connectionId);
  if (!connection || connection.expiresAt < Date.now()) {
    tokenStore.delete(connectionId);
    throw new AppError(
      "CONNECTION_EXPIRED",
      "Your Meta connection expired for this prototype session. Please reconnect.",
      401,
    );
  }

  const account = connection.accounts.find((item) => item.igUserId === igUserId);
  if (!account) {
    throw new AppError(
      "IG_ACCOUNT_NOT_IN_CONNECTION",
      "The selected Instagram account is not part of this Facebook connection.",
      403,
    );
  }

  return {
    accessToken: account.pageAccessToken || account.accessToken || connection.longLivedUserToken,
    authProvider: account.authProvider || connection.authProvider || "facebook",
    account,
  };
}

export function resolveConnectionAccount(connectionId, igUserId) {
  const connection = tokenStore.get(connectionId);
  if (!connection || connection.expiresAt < Date.now()) {
    tokenStore.delete(connectionId);
    throw new AppError(
      "CONNECTION_EXPIRED",
      "Your Meta connection expired for this prototype session. Please reconnect.",
      401,
    );
  }

  const account = connection.accounts.find((item) => item.igUserId === igUserId);
  if (!account) {
    throw new AppError(
      "IG_ACCOUNT_NOT_IN_CONNECTION",
      "The selected Instagram account is not part of this Facebook connection.",
      403,
    );
  }

  return { connection, account };
}

function cleanupExpiredConnections() {
  const now = Date.now();
  for (const [connectionId, connection] of tokenStore.entries()) {
    if (connection.expiresAt < now) {
      tokenStore.delete(connectionId);
    }
  }
}

function cleanupExpiredOAuthStates() {
  const now = Date.now();
  for (const [state, record] of oauthStateStore.entries()) {
    if (record.expiresAt < now) {
      oauthStateStore.delete(state);
    }
  }
}

async function safeDiagnosticCall(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: toDiagnosticError(error) };
  }
}

function toDiagnosticError(error) {
  return {
    code: error?.code || "UNKNOWN_ERROR",
    message: error?.message || String(error),
    details: error?.details || "",
    status: error?.status || null,
  };
}

function normalizeGranularScopes(scopes) {
  return scopes.map((scope) => ({
    scope: scope.scope || "",
    target_ids: Array.isArray(scope.target_ids) ? scope.target_ids : [],
  }));
}

function finalizeFacebookDiagnostic(diagnostic) {
  diagnostic.analysis = analyzeFacebookDiagnostic(diagnostic);
  return diagnostic;
}

function finalizeInstagramDiagnostic(diagnostic) {
  diagnostic.analysis = analyzeInstagramDiagnostic(diagnostic);
  return diagnostic;
}

function analyzeFacebookDiagnostic(diagnostic) {
  const scopes = new Set(diagnostic.summary.scopes || []);
  const missingScopes = [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
  ].filter((scope) => !scopes.has(scope));

  if (diagnostic.summary.tokenValid === false) {
    return {
      status: "token_invalid",
      message: "Meta says the returned access token is not valid.",
      nextStep: "Reconnect through Facebook Login for Business and make sure the app configuration is active.",
    };
  }

  if (missingScopes.length) {
    return {
      status: "missing_permissions",
      message: "The token does not contain every permission needed for the Facebook Page Instagram flow.",
      missingScopes,
      nextStep:
        "Add these permissions to the Facebook Login for Business configuration, save it, then remove the app from Facebook Business Integrations and reconnect.",
    };
  }

  if (diagnostic.summary.pageCount === 0) {
    return {
      status: "no_pages_returned",
      message: "Meta returned zero Facebook Pages for this user.",
      nextStep:
        "Authenticate with the Facebook user who manages the Page linked to the Instagram Business or Creator account, and grant Page access in the Meta consent screen.",
    };
  }

  if (diagnostic.summary.pagesWithInstagramBusinessAccount === 0) {
    return {
      status: "pages_without_linked_instagram",
      message:
        "Meta returned Facebook Pages, but none expose an instagram_business_account field to this app.",
      nextStep:
        "In Meta Business Suite, link the Instagram Business/Creator account to one of the returned Pages, then reconnect and grant access to that Page.",
    };
  }

  return {
    status: "ready",
    message: "The token, Page access, and linked Instagram account are visible to the backend.",
    nextStep: "Use the detected Instagram account ID for private insights.",
  };
}

function analyzeInstagramDiagnostic(diagnostic) {
  const lastError = diagnostic.errors.at(-1);

  if (!diagnostic.token.hasLongLivedToken) {
    return {
      status: "missing_token",
      message: "The Instagram authorization flow did not return a long-lived token.",
      nextStep: "Reconnect with Instagram Login direct and verify the Instagram App ID/App Secret.",
    };
  }

  if (!diagnostic.summary.profileAvailable) {
    return {
      status: "profile_unavailable",
      message: "The backend could not read the connected Instagram profile.",
      error: lastError?.error || null,
      nextStep:
        "Verify the app uses Instagram Login direct credentials and requests instagram_business_basic.",
    };
  }

  if (!["BUSINESS", "CREATOR"].includes(String(diagnostic.summary.accountType).toUpperCase())) {
    return {
      status: "not_professional_account",
      message: "The connected Instagram account is not reported as Business or Creator.",
      accountType: diagnostic.summary.accountType,
      nextStep: "Convert the Instagram account to Business or Creator, then reconnect.",
    };
  }

  if (diagnostic.errors.some((item) => item.step === "fetch_instagram_media")) {
    return {
      status: "media_unavailable",
      message: "The backend could read the profile, but could not read media.",
      error: lastError?.error || null,
      nextStep:
        "Verify the Instagram Login configuration includes instagram_business_basic and reconnect after removing the previous app authorization.",
    };
  }

  if (diagnostic.summary.mediaReturned === 0) {
    return {
      status: "no_media_returned",
      message: "The account is connected but Meta returned no recent media.",
      nextStep: "Publish or keep at least one eligible media object on the account, then retest.",
    };
  }

  if (diagnostic.summary.insightMetricsAvailable.length === 0) {
    const unavailableInsightErrors = diagnostic.insightProbe?.unavailableMetrics || [];
    const allMetricsBlockedByBusinessConversion =
      unavailableInsightErrors.length > 0 &&
      unavailableInsightErrors.every((item) => getMetaErrorSubcode(item.error) === 2108006);

    if (allMetricsBlockedByBusinessConversion) {
      return {
        status: "insights_media_before_business_conversion",
        message:
          "The backend can read the account and media, but Meta does not provide insights for media published before the account's latest Business or Creator conversion.",
        unavailableMetrics: diagnostic.summary.insightMetricsUnavailable,
        mediaId: diagnostic.summary.firstMediaId,
        metaSubcode: 2108006,
        nextStep:
          "Publish a new test post, reel, or carousel after the Business/Creator conversion, wait for Meta to process insights, then retest.",
      };
    }

    return {
      status: "insights_unavailable",
      message: "The backend can read the account and media, but none of the insight metrics are available.",
      unavailableMetrics: diagnostic.summary.insightMetricsUnavailable,
      nextStep:
        "Verify the Instagram Login configuration includes instagram_business_manage_insights. Some metrics can also be unavailable for unsupported media types.",
    };
  }

  return {
    status: "ready",
    message: "Instagram Login direct works for profile, media, and at least one insight metric.",
    nextStep: "Connect this backend result to the private dashboard.",
  };
}

function getMetaErrorSubcode(error) {
  const directSubcode = Number(error?.details?.error_subcode);
  if (Number.isFinite(directSubcode)) return directSubcode;

  const nestedSubcode = Number(error?.details?.error?.error_subcode);
  if (Number.isFinite(nestedSubcode)) return nestedSubcode;

  return null;
}
