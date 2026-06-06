import { NextResponse, type NextRequest } from "next/server";

/**
 * Central API auth gate.
 *
 * Sensitive routes (mutations, secret writes, operational logs, operator tools)
 * require a server token unless explicitly in demo mode. Behaviour:
 *   - DEMO_MODE=true            → allowed (explicit demo bypass)
 *   - AURA_API_TOKEN configured → require it (Bearer / x-aura-api-token / cookie)
 *   - no token, NODE_ENV!=prod  → allowed (dev convenience; flagged by production:check)
 *   - no token, NODE_ENV=prod   → fail closed (401)
 *
 * Public routes (always open): health, the whole OAuth flow, and the read-only
 * public client config. Everything else under the protected prefixes is gated.
 */

const PROTECTED_PREFIXES = [
  "/api/loyalty",
  "/api/rewards",
  "/api/fan-pass",
  "/api/agent",
  "/api/b2b-agent",
  "/api/operator",
  "/api/workspace",
  "/api/token-economy",
  "/api/meta", // includes runtime-config (writes appSecret), discovery-source, debug, client-log
];

// Explicit public allow-list (checked before PROTECTED_PREFIXES).
const PUBLIC_EXACT = new Set<string>([
  "/api/system/health",
  "/api/meta/config", // public client config — contains appId (public), never the secret
]);
const PUBLIC_PREFIXES = [
  "/api/auth/", // entire OAuth flow: start + Instagram/Facebook callbacks (no auth header possible)
];

function isProtected(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return false;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function tokenFromRequest(req: NextRequest): string {
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-aura-api-token");
  if (x) return x.trim();
  const cookie = req.cookies.get("aura_api_token")?.value;
  return cookie ? cookie.trim() : "";
}

/** Constant-time-ish string compare to avoid trivial timing leaks on the token. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function deny(code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message, details: "" } }, { status: 401 });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (!isProtected(pathname)) return NextResponse.next();

  if (process.env.DEMO_MODE === "true") return NextResponse.next();

  const configuredToken = process.env.AURA_API_TOKEN || "";
  const isProd = process.env.NODE_ENV === "production";

  if (!configuredToken) {
    // No token configured: open in dev (preserves local workflow), closed in prod.
    if (isProd) return deny("AUTH_NOT_CONFIGURED", "API auth token is not configured on the server.");
    return NextResponse.next();
  }

  const provided = tokenFromRequest(req);
  if (provided && safeEqual(provided, configuredToken)) return NextResponse.next();
  return deny("UNAUTHORIZED", "Authentication required for this endpoint.");
}

export const config = {
  matcher: "/api/:path*",
};
