import { normalizeInsightMetrics } from "./utils";
import type { MetaClient } from "./metaClient";
import type { MediaInsightWarning, MetaAuthProvider, MetaMedia, PrivateInsightsPayload, PrivateMediaWithInsights } from "./types";

const PRIVATE_MEDIA_INSIGHT_METRICS = ["impressions", "reach", "saved"];

export async function fetchPrivateMediaWithInsights(
  metaClient: MetaClient,
  igUserId: string,
  accessToken: string,
  authProvider: MetaAuthProvider = "facebook",
): Promise<PrivateInsightsPayload> {
  const [profile, mediaResponse] = await Promise.all([
    metaClient.fetchInstagramProfile(igUserId, accessToken, authProvider),
    metaClient.fetchInstagramMedia(igUserId, accessToken, 10, authProvider),
  ]);
  const profileRecord = profile as Record<string, unknown>;

  const media = Array.isArray(mediaResponse?.data) ? (mediaResponse.data as MetaMedia[]) : [];
  const warnings: MediaInsightWarning[] = [];
  const mediaWithInsights: PrivateMediaWithInsights[] = [];

  for (const item of media) {
    const insightResult = await fetchMediaInsightsSafely(metaClient, item.id, PRIVATE_MEDIA_INSIGHT_METRICS, accessToken, authProvider);
    warnings.push(...insightResult.warnings);
    mediaWithInsights.push({
      id: item.id,
      caption: item.caption || "",
      mediaType: item.media_type || "UNKNOWN",
      mediaUrl: item.media_url || "",
      thumbnailUrl: item.thumbnail_url || item.media_url || "",
      permalink: item.permalink || "",
      timestamp: item.timestamp || "",
      likeCount: item.like_count || 0,
      commentsCount: item.comments_count || 0,
      insights: insightResult.metrics,
      unavailableMetrics: insightResult.unavailableMetrics,
    });
  }

  return {
    profile: {
      id: String(profileRecord.id || igUserId),
      username: String(profileRecord.username || ""),
      name: String(profileRecord.name || profileRecord.username || "Instagram account"),
      profile_picture_url: String(profileRecord.profile_picture_url || ""),
      followers_count: Number(profileRecord.followers_count || 0),
      media_count: Number(profileRecord.media_count || 0),
    },
    media: mediaWithInsights,
    warnings,
  };
}

async function fetchMediaInsightsSafely(metaClient: MetaClient, mediaId: string, metrics: string[], accessToken: string, authProvider: MetaAuthProvider) {
  try {
    const response = await metaClient.fetchMediaInsights(mediaId, metrics, accessToken, authProvider);
    return { metrics: normalizeInsightMetrics(response), unavailableMetrics: [] as string[], warnings: [] as MediaInsightWarning[] };
  } catch {
    const metricsResult: Record<string, number> = {};
    const unavailableMetrics: string[] = [];
    const warnings: MediaInsightWarning[] = [];
    for (const metric of metrics) {
      try {
        const response = await metaClient.fetchMediaInsights(mediaId, metric, accessToken, authProvider);
        Object.assign(metricsResult, normalizeInsightMetrics(response));
      } catch (metricError) {
        const error = metricError as { code?: string; status?: number; details?: { error_subcode?: number; error?: { error_subcode?: number } }; message?: string };
        const metaSubcode = getMetaErrorSubcode(error);
        unavailableMetrics.push(metric);
        warnings.push({
          mediaId,
          metric,
          code: error.code || "META_METRIC_UNAVAILABLE",
          status: error.status || null,
          metaSubcode,
          reason: metaSubcode === 2108006 ? "MEDIA_BEFORE_BUSINESS_CONVERSION" : "METRIC_UNAVAILABLE",
          message:
            metaSubcode === 2108006
              ? "This media was published before the account's latest Business or Creator conversion, so Meta does not provide historical insights for it."
              : error.message || "This metric is unavailable for this media object or token permissions.",
        });
      }
    }
    return { metrics: metricsResult, unavailableMetrics, warnings };
  }
}

function getMetaErrorSubcode(error: { details?: { error_subcode?: number; error?: { error_subcode?: number } } }) {
  const direct = Number(error?.details?.error_subcode);
  if (Number.isFinite(direct)) return direct;
  const nested = Number(error?.details?.error?.error_subcode);
  return Number.isFinite(nested) ? nested : null;
}
