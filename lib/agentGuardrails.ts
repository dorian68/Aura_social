/* ============================================================
   AURA — Shared agentic guardrails
   Central, server-side enforced invariants for every agent
   subsystem (operator, recommendations, B2B). These are the
   safety primitives that must hold EVEN WITHOUT auth: side-effect
   capability gating, money-path validation, and string/identifier
   sanitation. Keep gates here so wiring a real adapter later cannot
   silently bypass them.
   ============================================================ */

/** Capability flags. Each guards a class of real-world side effects.
 *  Default = OFF (safe). Flip via env only when intentionally going live. */
export type SideEffectCapability = "onchain_writes" | "outreach_sending" | "real_payments";

const CAPABILITY_ENV: Record<SideEffectCapability, string> = {
  onchain_writes: "AURA_ALLOW_ONCHAIN_WRITES",
  outreach_sending: "OUTREACH_SENDING_ENABLED",
  real_payments: "AURA_ALLOW_REAL_PAYMENTS",
};

/** True only when the operator has explicitly opted a capability in via env. */
export function isCapabilityEnabled(capability: SideEffectCapability): boolean {
  return String(process.env[CAPABILITY_ENV[capability]] || "").toLowerCase() === "true";
}

/** Throw if a real side effect is attempted while its capability is disabled.
 *  Call this at every boundary that could touch the outside world. */
export function assertCapabilityEnabled(capability: SideEffectCapability): void {
  if (!isCapabilityEnabled(capability)) {
    throw new GuardrailError(
      "SIDE_EFFECT_DISABLED",
      `Real "${capability}" is disabled. Set ${CAPABILITY_ENV[capability]}=true to enable it intentionally.`,
    );
  }
}

/** Error type carrying a stable machine code; safe to surface to clients. */
export class GuardrailError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GuardrailError";
    this.code = code;
  }
}

// ─── Money-path validation ────────────────────────────────────────────────────

export interface AmountOptions {
  min?: number;
  max?: number;
  /** Allow 0 (default false — most budgets must be strictly positive). */
  allowZero?: boolean;
  /** Fallback when the value is null/undefined (NOT for invalid types). */
  fallback?: number;
}

const DEFAULT_MAX_AMOUNT = 100_000_000; // hard ceiling to stop overflow/abuse

/**
 * Coerce-and-validate a monetary/quantity input. Rejects NaN, Infinity,
 * negatives, out-of-range, and non-numeric types — instead of the unsafe
 * `Number(x) || default` / `x || default` patterns that let `0`, strings,
 * and `NaN` through. Returns a finite, bounded number or throws GuardrailError.
 */
export function validateAmount(value: unknown, label = "amount", options: AmountOptions = {}): number {
  const { min = 0, max = DEFAULT_MAX_AMOUNT, allowZero = false, fallback } = options;

  if ((value === undefined || value === null || value === "") && fallback !== undefined) {
    return fallback;
  }

  const num = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;

  if (!Number.isFinite(num)) {
    throw new GuardrailError("INVALID_AMOUNT", `${label} must be a finite number.`);
  }
  if (!allowZero && num === 0) {
    throw new GuardrailError("INVALID_AMOUNT", `${label} must be greater than zero.`);
  }
  if (num < min) {
    throw new GuardrailError("INVALID_AMOUNT", `${label} must be ≥ ${min}.`);
  }
  if (num > max) {
    throw new GuardrailError("INVALID_AMOUNT", `${label} must be ≤ ${max}.`);
  }
  return num;
}

// ─── String / identifier sanitation ───────────────────────────────────────────

const DEFAULT_STRING_MAX = 2_000;

/** Validate a bounded, non-control-character string. Throws on type/length issues. */
export function validateBoundedString(value: unknown, label = "value", maxLength = DEFAULT_STRING_MAX): string {
  if (typeof value !== "string") {
    throw new GuardrailError("INVALID_STRING", `${label} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new GuardrailError("INVALID_STRING", `${label} exceeds the maximum length of ${maxLength}.`);
  }
  return value;
}

/** Validate an opaque identifier (id from the client used for lookups). */
export function validateIdentifier(value: unknown, label = "id", maxLength = 128): string {
  const s = validateBoundedString(value, label, maxLength);
  if (s.trim() === "") {
    throw new GuardrailError("INVALID_ID", `${label} must not be empty.`);
  }
  return s;
}

/** Filter an incoming list down to an allow-list, rejecting unknown members. */
export function assertAllowedValues<T extends string>(values: unknown, allowed: readonly T[], label = "values"): T[] {
  if (!Array.isArray(values)) {
    throw new GuardrailError("INVALID_ENUM_LIST", `${label} must be an array.`);
  }
  const set = new Set<string>(allowed);
  const out: T[] = [];
  for (const v of values) {
    if (typeof v !== "string" || !set.has(v)) {
      throw new GuardrailError("INVALID_ENUM_LIST", `${label} contains an unsupported value: ${String(v)}.`);
    }
    out.push(v as T);
  }
  return out;
}
