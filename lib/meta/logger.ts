import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOG_DIR = process.env.META_LOG_DIR || path.resolve(process.cwd(), "data/meta/logs");
const LOG_FILE = process.env.META_LOG_FILE || path.join(LOG_DIR, "aura-meta.ndjson");
const SENSITIVE_KEY_PATTERN = /(^state$|secret|token|access_token|authorization|cookie|password|client_secret|private_key)/i;

export function createRequestId() {
  return crypto.randomUUID();
}

export function logMetaInfo(event: string, data: Record<string, unknown> = {}) {
  writeLog("info", event, data);
}

export function logMetaWarn(event: string, data: Record<string, unknown> = {}) {
  writeLog("warn", event, data);
}

export function logMetaError(event: string, data: Record<string, unknown> = {}) {
  writeLog("error", event, data);
}

export function readRecentMetaLogs(lines = 200) {
  ensureLogDir();
  if (!fs.existsSync(LOG_FILE)) return [];
  const safeLines = Math.min(1000, Math.max(1, Number(lines) || 200));
  return fs
    .readFileSync(LOG_FILE, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-safeLines)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { level: "warn", event: "meta_log_parse_failed", raw: line };
      }
    });
}

export function getMetaLogFilePath() {
  return LOG_FILE;
}

export function redactMetaValue(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY_PATTERN.test(key)) return summarizeSensitiveValue(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactMetaValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([childKey, childValue]) => [childKey, redactMetaValue(childValue, childKey)]),
    );
  }
  if (typeof value === "string") {
    if (looksLikeToken(value)) return summarizeSensitiveValue(value);
    return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
  }
  return value;
}

function writeLog(level: "info" | "warn" | "error", event: string, data: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    data: redactMetaValue(data),
  };
  ensureLogDir();
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  const line = `[${entry.ts}] ${level.toUpperCase()} ${event} ${JSON.stringify(entry.data)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function summarizeSensitiveValue(value: unknown) {
  const text = String(value || "");
  if (!text) return "";
  const suffix = text.length > 4 ? text.slice(-4) : "";
  return `[redacted len=${text.length}${suffix ? ` last4=${suffix}` : ""}]`;
}

function looksLikeToken(value: string) {
  return value.length > 80 && (/^[A-Za-z0-9._~-]+$/.test(value) || value.includes("EAAB") || value.includes("IGQ"));
}
