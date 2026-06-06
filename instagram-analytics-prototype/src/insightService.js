import { normalizeInsightMetrics } from "./utils.js";

const PRIVATE_MEDIA_INSIGHT_METRICS = ["impressions", "reach", "saved"];

export async function fetchPrivateMediaWithInsights(
  metaClient,
  igUserId,
  accessToken,
  authProvider = "facebook",
) {
  const [profile, mediaResponse] = await Promise.all([
    metaClient.fetchInstagramProfile(igUserId, accessToken, authProvider),
    metaClient.fetchInstagramMedia(igUserId, accessToken, 10, authProvider),
  ]);

  const media = Array.isArray(mediaResponse?.data) ? mediaResponse.data : [];
  const warnings = [];
  const mediaWithInsights = [];

  for (const item of media) {
    const insightResult = await fetchMediaInsightsSafely(
      metaClient,
      item.id,
      PRIVATE_MEDIA_INSIGHT_METRICS,
      accessToken,
      authProvider,
    );

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
    profile,
    media: mediaWithInsights,
    warnings,
  };
}

async function fetchMediaInsightsSafely(metaClient, mediaId, metrics, accessToken, authProvider) {
  try {
    const response = await metaClient.fetchMediaInsights(mediaId, metrics, accessToken, authProvider);
    return {
      metrics: normalizeInsightMetrics(response),
      unavailableMetrics: [],
      warnings: [],
    };
  } catch (groupError) {
    const metricsResult = {};
    const unavailableMetrics = [];
    const warnings = [];

    for (const metric of metrics) {
      try {
        const response = await metaClient.fetchMediaInsights(mediaId, metric, accessToken, authProvider);
        Object.assign(metricsResult, normalizeInsightMetrics(response));
      } catch (metricError) {
        const metaSubcode = getMetaErrorSubcode(metricError);
        unavailableMetrics.push(metric);
        warnings.push({
          mediaId,
          metric,
          code: metricError?.code || "META_METRIC_UNAVAILABLE",
          status: metricError?.status || null,
          metaSubcode,
          reason:
            metaSubcode === 2108006
              ? "MEDIA_BEFORE_BUSINESS_CONVERSION"
              : "METRIC_UNAVAILABLE",
          message:
            metaSubcode === 2108006
              ? "This media was published before the account's latest Business or Creator conversion, so Meta does not provide historical insights for it."
              : metricError?.message ||
                "This metric is unavailable for this media object or token permissions.",
        });
      }
    }

    return {
      metrics: metricsResult,
      unavailableMetrics,
      warnings,
    };
  }
}

function getMetaErrorSubcode(error) {
  const directSubcode = Number(error?.details?.error_subcode);
  if (Number.isFinite(directSubcode)) return directSubcode;

  const nestedSubcode = Number(error?.details?.error?.error_subcode);
  if (Number.isFinite(nestedSubcode)) return nestedSubcode;

  return null;
}
