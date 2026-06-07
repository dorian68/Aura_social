/**
 * Secret sanitation for AG-UI (AG_UI_IMPLEMENTATION_GUIDE §13).
 *
 * Anything that flows toward the model or the frontend (state snapshots, tool
 * args, context) is passed through sanitizeForAgent first so tokens, keys and
 * other secrets never leak into the conversation or the UI.
 */

const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|token|password|secret|authorization|cookie|set-cookie|private[_-]?key|refresh[_-]?token|access[_-]?token|client[_-]?secret|bearer|credential)/i;

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /^0x[a-fA-F0-9]{40,}$/, // wallet private keys / long hex
  /^eyJ[A-Za-z0-9_-]{10,}\./, // JWT
  /^(sk|rk|whsec|pk_live|sk_live)_[A-Za-z0-9]{8,}$/, // provider secret keys
  /^[A-Za-z0-9_-]{40,}$/, // long opaque tokens
];

const REDACTED = "[redacted]";

export function sanitizeForAgent<T>(input: T, depth = 0): T {
  if (depth > 8 || input == null) return input;

  if (typeof input === "string") {
    return (SENSITIVE_VALUE_PATTERNS.some((re) => re.test(input.trim())) ? REDACTED : input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForAgent(item, depth + 1)) as unknown as T;
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = sanitizeForAgent(value, depth + 1);
      }
    }
    return out as unknown as T;
  }

  return input;
}
