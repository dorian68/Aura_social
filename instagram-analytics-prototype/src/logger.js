import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOG_DIR = process.env.LOG_DIR || path.resolve(process.cwd(), "../data/instagram/logs");
const LOG_FILE = process.env.LOG_FILE || path.join(LOG_DIR, "prototype.ndjson");
const SENSITIVE_KEY_PATTERN =
  /(^state$|secret|token|access_token|authorization|cookie|password|client_secret)/i;

export function createRequestId() {
  return crypto.randomUUID();
}

export function logInfo(event, data = {}) {
  writeLog("info", event, data);
}

export function logWarn(event, data = {}) {
  writeLog("warn", event, data);
}

export function logError(event, data = {}) {
  writeLog("error", event, data);
}

export function readRecentLogs(lines = 200) {
  ensureLogDir();
  if (!fs.existsSync(LOG_FILE)) return [];

  const safeLines = Math.min(1000, Math.max(1, Number(lines) || 200));
  const content = fs.readFileSync(LOG_FILE, "utf8");
  return content
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-safeLines)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { level: "warn", event: "log.parse_failed", raw: line };
      }
    });
}

export function getLogFilePath() {
  return LOG_FILE;
}

export function redact(value) {
  return redactValue(value);
}

function writeLog(level, event, data) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    data: redactValue(data),
  };

  ensureLogDir();
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");

  const consoleLine = `[${entry.ts}] ${level.toUpperCase()} ${event} ${JSON.stringify(entry.data)}`;
  if (level === "error") console.error(consoleLine);
  else if (level === "warn") console.warn(consoleLine);
  else console.log(consoleLine);
}

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function redactValue(value, key = "") {
  if (value === null || value === undefined) return value;

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return summarizeSensitiveValue(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactValue(item));
  }

  if (typeof value === "object") {
    const output = {};
    for (const [childKey, childValue] of Object.entries(value).slice(0, 80)) {
      output[childKey] = redactValue(childValue, childKey);
    }
    return output;
  }

  if (typeof value === "string") {
    if (looksLikeToken(value)) return summarizeSensitiveValue(value);
    return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
  }

  return value;
}

function summarizeSensitiveValue(value) {
  const text = String(value || "");
  if (!text) return "";
  const suffix = text.length > 4 ? text.slice(-4) : "";
  return `[redacted len=${text.length}${suffix ? ` last4=${suffix}` : ""}]`;
}

function looksLikeToken(value) {
  return (
    value.length > 80 &&
    (/^[A-Za-z0-9._~-]+$/.test(value) || value.includes("EAAB") || value.includes("IGQ"))
  );
}
