import { getMetaConfig, getMetaSetupStatus } from "./configStore";
import { createMetaClient } from "./metaClient";
import { fetchPrivateMediaWithInsights } from "./insightService";
import type { MetaAuthProvider } from "./types";

export function diagnoseMetaConfiguration() {
  const config = getMetaConfig();
  const setup = getMetaSetupStatus();
  const missing: string[] = [];
  if (!setup.hasAppId) missing.push("APP_ID or runtime appId");
  if (!setup.hasAppSecret) missing.push("APP_SECRET or runtime appSecret");
  if (config.authMode === "facebook" && !config.facebookLoginConfigId) missing.push("FACEBOOK_LOGIN_CONFIG_ID");

  return {
    success: missing.length === 0 || setup.mockMeta,
    mode: config.authMode,
    mockMeta: setup.mockMeta,
    graphApiVersion: config.graphApiVersion,
    setup,
    missing,
    next:
      missing.length > 0 && !setup.mockMeta
        ? "Configure Meta credentials in the dashboard or environment, then rerun debug:meta-flow."
        : "Configuration is sufficient to start the OAuth flow.",
  };
}

export async function diagnoseAccessToken(input: { accessToken: string; provider: MetaAuthProvider; igUserId?: string }) {
  const metaClient = createMetaClient();
  const errors: Array<{ step: string; error: unknown }> = [];
  const summary = {
    provider: input.provider,
    tokenPresent: Boolean(input.accessToken),
    profileAvailable: false,
    mediaReturned: 0,
    insightMetricsAvailable: [] as string[],
    insightMetricsUnavailable: [] as string[],
  };

  try {
    if (input.provider === "facebook") {
      const token = await metaClient.debugFacebookToken(input.accessToken);
      const tokenData = (token.data || {}) as { is_valid?: boolean; scopes?: string[]; granular_scopes?: unknown[] };
      const pages = await metaClient.fetchPages(input.accessToken);
      return {
        success: Boolean(tokenData.is_valid),
        provider: "facebook",
        token: {
          isValid: Boolean(tokenData.is_valid),
          scopes: tokenData.scopes || [],
          granularScopes: tokenData.granular_scopes || [],
        },
        pages: Array.isArray(pages.data) ? pages.data.length : 0,
        next: "If pages is 0, authenticate with the Facebook user that manages the Page linked to the Instagram professional account.",
      };
    }

    const payload = await fetchPrivateMediaWithInsights(metaClient, input.igUserId || "me", input.accessToken, "instagram");
    summary.profileAvailable = Boolean(payload.profile.username);
    summary.mediaReturned = payload.media.length;
    const warnings = payload.warnings || [];
    summary.insightMetricsUnavailable = Array.from(new Set(warnings.map((warning) => warning.metric)));
    summary.insightMetricsAvailable = ["impressions", "reach", "saved"].filter((metric) => !summary.insightMetricsUnavailable.includes(metric));
    return {
      success: summary.profileAvailable,
      summary,
      profile: {
        id: payload.profile.id,
        username: payload.profile.username,
        followersCount: payload.profile.followers_count,
        mediaCount: payload.profile.media_count,
      },
      warnings,
      next:
        summary.insightMetricsAvailable.length > 0
          ? "Token can read profile, media and at least one insights metric."
          : "Token can be checked further after publishing eligible media and ensuring insights permission is granted.",
    };
  } catch (error) {
    errors.push({ step: "diagnose_access_token", error: error instanceof Error ? error.message : String(error) });
    return { success: false, summary, errors, next: "Inspect the structured error and fix credentials, account type or permissions." };
  }
}
