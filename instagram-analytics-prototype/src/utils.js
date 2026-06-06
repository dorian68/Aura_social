export class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function sanitizeUsername(input) {
  const username = String(input || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();

  if (!username) {
    throw new AppError("INVALID_USERNAME", "Enter an Instagram username.", 400);
  }

  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    throw new AppError(
      "INVALID_USERNAME",
      "Instagram usernames can only contain letters, numbers, periods, and underscores.",
      400,
    );
  }

  return username;
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function safeDivide(numerator, denominator, fallback = 0) {
  const top = toNumber(numerator);
  const bottom = toNumber(denominator);
  if (!bottom) return fallback;
  return top / bottom;
}

export function sum(values) {
  return values.reduce((total, value) => total + toNumber(value), 0);
}

export function average(values) {
  const validValues = values.map((value) => toNumber(value, null)).filter((value) => value !== null);
  if (!validValues.length) return 0;
  return sum(validValues) / validValues.length;
}

export function round(value, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(toNumber(value) * multiplier) / multiplier;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, toNumber(value)));
}

export function calculateEngagementRate(likes, comments, followers) {
  return round(safeDivide(toNumber(likes) + toNumber(comments), followers) * 100, 2);
}

export function formatPercentage(value, digits = 2) {
  return `${round(value, digits).toFixed(digits)}%`;
}

export function normalizeInsightMetrics(insights) {
  const rows = Array.isArray(insights?.data) ? insights.data : Array.isArray(insights) ? insights : [];

  return rows.reduce((metrics, row) => {
    if (!row?.name) return metrics;

    const values = Array.isArray(row.values) ? row.values : [];
    const latestValue = values.length ? values[values.length - 1]?.value : row.value;
    metrics[row.name] = toNumber(latestValue, 0);
    return metrics;
  }, {});
}

export function buildPublicScore({
  averageEngagementRate,
  postingFrequencyEstimate,
  postsAnalyzed,
  averageLikes,
  averageComments,
}) {
  const postsPerWeek = postingFrequencyEstimate?.posts_per_week || 0;
  const commentToLikeRatio = safeDivide(averageComments, averageLikes);

  // Transparent heuristic:
  // - engagement rewards accounts approaching 4% average public engagement;
  // - consistency rewards roughly 3 posts per week;
  // - volume rewards having enough recent public posts to analyze;
  // - conversation rewards comments representing up to 8% of likes.
  const components = {
    engagement: round(clamp(safeDivide(averageEngagementRate, 4) * 40, 0, 40), 1),
    consistency: round(clamp(safeDivide(postsPerWeek, 3) * 25, 0, 25), 1),
    content_volume: round(clamp(safeDivide(postsAnalyzed, 12) * 20, 0, 20), 1),
    conversation: round(clamp(safeDivide(commentToLikeRatio, 0.08) * 15, 0, 15), 1),
  };

  return {
    score: Math.round(sum(Object.values(components))),
    components,
  };
}

export function createStructuredError(error) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      payload: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details || null,
        },
      },
    };
  }

  return {
    status: 500,
    payload: {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong while processing the request.",
        details: process.env.NODE_ENV === "production" ? null : error?.message || String(error),
      },
    },
  };
}

export function metaErrorToAppError(error, fallbackMessage) {
  if (error instanceof AppError) return error;

  const response = error?.response;
  const metaError =
    response?.data?.error ||
    (response?.data?.error_message
      ? {
          message: response.data.error_message,
          type: response.data.error_type || response.data.error_reason || null,
          code: response.data.code || null,
        }
      : null);
  const status = response?.status || 502;
  const message = metaError?.message || fallbackMessage || "Meta API request failed.";

  if (status === 400 || status === 404) {
    return new AppError("META_UNAVAILABLE", message, status, metaError || response?.data || null);
  }

  if (status === 401 || status === 403) {
    return new AppError(
      "META_PERMISSION_OR_TOKEN_ERROR",
      "Meta rejected the request. The token may be expired or missing required permissions.",
      status,
      metaError || response?.data || null,
    );
  }

  if (status === 429) {
    return new AppError(
      "META_RATE_LIMITED",
      "Meta rate limited the request. Try again later.",
      429,
      metaError || response?.data || null,
    );
  }

  return new AppError("META_API_ERROR", message, status, metaError || response?.data || null);
}
