export class MetaAppError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, message: string, status = 400, details: unknown = null) {
    super(message);
    this.name = "MetaAppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function sum(values: unknown[]) {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

export function average(values: unknown[]) {
  const valid = values.map((value) => toNumber(value, Number.NaN)).filter(Number.isFinite);
  return valid.length ? sum(valid) / valid.length : 0;
}

export function safeDivide(numerator: unknown, denominator: unknown, fallback = 0) {
  const bottom = toNumber(denominator);
  if (!bottom) return fallback;
  return toNumber(numerator) / bottom;
}

export function round(value: unknown, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(toNumber(value) * multiplier) / multiplier;
}

export function clamp(value: unknown, min: number, max: number) {
  return Math.min(max, Math.max(min, toNumber(value)));
}

export function calculateEngagementRate(likes: unknown, comments: unknown, followers: unknown) {
  return round(safeDivide(toNumber(likes) + toNumber(comments), followers) * 100, 2);
}

export function normalizeInsightMetrics(input: unknown) {
  const source = input as { data?: Array<{ name?: string; values?: Array<{ value?: unknown }>; value?: unknown }> };
  const rows = Array.isArray(source?.data) ? source.data : Array.isArray(input) ? input : [];
  return rows.reduce<Record<string, number>>((metrics, row) => {
    if (!row?.name) return metrics;
    const values = Array.isArray(row.values) ? row.values : [];
    const latest = values.length ? values[values.length - 1]?.value : row.value;
    metrics[row.name] = toNumber(latest, 0);
    return metrics;
  }, {});
}

export function structuredMetaError(error: unknown) {
  if (error instanceof MetaAppError) {
    return {
      status: error.status,
      payload: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  return {
    status: 500,
    payload: {
      success: false,
      error: {
        code: "META_INTERNAL_ERROR",
        message: "The Meta request could not be processed.",
        details: process.env.NODE_ENV === "production" ? null : error instanceof Error ? error.message : String(error),
      },
    },
  };
}

export function metaResponseToAppError(payload: unknown, status = 502, fallbackMessage = "Meta API request failed.") {
  const record = payload as {
    error?: { message?: string; code?: number; type?: string; error_subcode?: number };
    error_message?: string;
    error_type?: string;
    error_reason?: string;
  };
  const metaError =
    record?.error ||
    (record?.error_message
      ? {
          message: record.error_message,
          type: record.error_type || record.error_reason || "",
        }
      : null);
  const message = metaError?.message || fallbackMessage;

  if (status === 401 || status === 403) {
    return new MetaAppError(
      "META_PERMISSION_OR_TOKEN_ERROR",
      "Meta rejected the request. The token may be expired or missing required permissions.",
      status,
      metaError || payload,
    );
  }

  if (status === 429) {
    return new MetaAppError("META_RATE_LIMITED", "Meta rate limited the request. Try again later.", 429, metaError || payload);
  }

  if (status === 400 || status === 404) {
    return new MetaAppError("META_UNAVAILABLE", message, status, metaError || payload);
  }

  return new MetaAppError("META_API_ERROR", message, status, metaError || payload);
}

export function summarizePublicId(value: unknown) {
  const text = String(value || "");
  return text ? { length: text.length, last4: text.slice(-4) } : "";
}

export function sanitizeDiagnosticId(value: unknown) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export function escapeHtml(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
