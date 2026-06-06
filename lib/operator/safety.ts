import crypto from "node:crypto";
import type { ToolRiskLevel } from "./types";

// ─── Server-issued confirmation tokens ────────────────────────────────────────
// A `confirmation_required` tool must be executed with a single-use token that
// the server issued for that EXACT (tool, args) pair. This replaces the old
// client-asserted `confirmed: true` boolean, which any caller could forge in a
// single request. Tokens are opaque random nonces tracked server-side, bound to
// an args hash, single-use (deleted on verify) and short-lived.

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const confirmationStore = new Map<string, { tool: string; argsHash: string; expiresAt: number }>();

function hashArgs(args: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(stableStringify(args)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function cleanupExpiredConfirmations() {
  const now = Date.now();
  for (const [token, rec] of confirmationStore.entries()) {
    if (rec.expiresAt < now) confirmationStore.delete(token);
  }
}

export function issueConfirmationToken(tool: string, args: Record<string, unknown>): string {
  cleanupExpiredConfirmations();
  const token = crypto.randomUUID();
  confirmationStore.set(token, { tool, argsHash: hashArgs(args), expiresAt: Date.now() + CONFIRMATION_TTL_MS });
  return token;
}

export function verifyConfirmationToken(token: unknown, tool: string, args: Record<string, unknown>): boolean {
  if (typeof token !== "string" || !token) return false;
  const rec = confirmationStore.get(token);
  confirmationStore.delete(token); // single-use regardless of outcome
  if (!rec) return false;
  if (rec.expiresAt < Date.now()) return false;
  if (rec.tool !== tool) return false;
  if (rec.argsHash !== hashArgs(args)) return false;
  return true;
}

const DANGEROUS_PATTERNS = [
  /send.*real/i,
  /publish.*live/i,
  /deploy.*contract/i,
  /mint.*live/i,
  /delete/i,
  /expose.*token/i,
  /charge.*real/i,
];

export function isSafeToExecute(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "safe";
}

export function requiresConfirmation(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "confirmation_required";
}

export function isDangerous(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "dangerous";
}

export function checkMessageForRisk(message: string): {
  blocked: boolean;
  reason?: string;
} {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        reason: `Message matches sensitive pattern: ${pattern.source}`,
      };
    }
  }
  return { blocked: false };
}

export function buildConfirmationPrompt(
  toolName: string,
  args: Record<string, unknown>,
  warning: string,
): string {
  const argSummary = Object.entries(args)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
  return `This action requires confirmation.\n\nTool: ${toolName}\nArgs: ${argSummary}\n\nWarning: ${warning}\n\nReply "confirm" to proceed or "cancel" to abort.`;
}

// Value-based secret heuristics: long hex (private keys), JWT-like, and long
// opaque tokens. Redaction must not rely on the key name alone — a secret passed
// under an innocuous key (e.g. "note") must still be caught.
const SECRET_VALUE_PATTERNS = [
  /\b0x[a-fA-F0-9]{64}\b/, // 32-byte hex (private key / raw key material)
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, // JWT
  /\b[A-Za-z0-9_-]{40,}\b/, // long opaque token/authtoken
];

function redactValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(value)) return "[REDACTED]";
  }
  return value;
}

export function sanitizeArgSummary(args: Record<string, unknown>): string {
  return JSON.stringify(redactArgs(args)).slice(0, 200);
}

/** Returns a copy of args with secret-looking keys/values redacted. */
export function redactArgs(args: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (/token|secret|password|key|credential|authorization/i.test(key)) {
      safe[key] = "[REDACTED]";
    } else {
      safe[key] = redactValue(value);
    }
  }
  return safe;
}
