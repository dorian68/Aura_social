import { NextResponse, type NextRequest } from "next/server";

type AuraRole = "viewer" | "creator" | "operator" | "admin";

interface ApiPrincipal {
  token: string;
  subject: string;
  role: AuraRole;
  workspaceIds: string[];
  authMode: "api_key" | "legacy_admin_token" | "demo" | "development_bypass";
}

const DEFAULT_WORKSPACE_ID = "workspace_aura_demo";
const ROLE_LEVEL: Record<AuraRole, number> = {
  viewer: 0,
  creator: 1,
  operator: 2,
  admin: 3,
};

const PROTECTED_PREFIXES = [
  "/api/loyalty",
  "/api/rewards",
  "/api/fan-pass",
  "/api/agent",
  "/api/b2b-agent",
  "/api/operator",
  "/api/ag-ui",
  "/api/workspace",
  "/api/token-economy",
  "/api/meta",
  "/api/payments",
  "/api/test",
];

const PUBLIC_EXACT = new Set<string>([
  "/api/system/health",
  "/api/meta/config",
  "/api/payments/stripe/webhook",
]);
const PUBLIC_PREFIXES = ["/api/auth/"];

function isProtected(pathname: string) {
  if (PUBLIC_EXACT.has(pathname)) return false;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function tokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return (
    request.headers.get("x-aura-api-token")?.trim() ||
    request.cookies.get("aura_api_token")?.value?.trim() ||
    ""
  );
}

function requestedWorkspace(request: NextRequest) {
  return request.headers.get("x-aura-workspace-id")?.trim() || "";
}

function requiredRole(request: NextRequest): AuraRole {
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api/test") ||
    pathname.startsWith("/api/meta/runtime-config") ||
    pathname.startsWith("/api/meta/debug")
  ) {
    return "admin";
  }
  if (request.method === "GET" || request.method === "HEAD") return "viewer";
  if (
    pathname.startsWith("/api/loyalty") ||
    pathname.startsWith("/api/rewards") ||
    pathname.startsWith("/api/fan-pass") ||
    pathname.startsWith("/api/agent")
  ) {
    return "creator";
  }
  return "operator";
}

function configuredPrincipals(): ApiPrincipal[] {
  const principals: ApiPrincipal[] = [];
  const configured = process.env.AURA_API_KEYS_JSON;
  if (configured) {
    try {
      const entries = JSON.parse(configured) as Array<Record<string, unknown>>;
      for (const entry of entries) {
        const token = cleanString(entry.token);
        if (!token || token.length < 24) continue;
        principals.push({
          token,
          subject: cleanString(entry.subject) || "api-user",
          role: normalizeRole(entry.role),
          workspaceIds: normalizeWorkspaceIds(entry.workspaceIds),
          authMode: "api_key",
        });
      }
    } catch {
      // Invalid auth configuration fails closed in production below.
    }
  }

  const legacyToken = process.env.AURA_API_TOKEN || "";
  if (legacyToken) {
    principals.push({
      token: legacyToken,
      subject: "legacy-admin",
      role: "admin",
      workspaceIds: ["*"],
      authMode: "legacy_admin_token",
    });
  }
  return principals;
}

function authenticate(request: NextRequest): ApiPrincipal | null {
  const provided = tokenFromRequest(request);
  if (!provided) return null;
  return configuredPrincipals().find((principal) => safeEqual(provided, principal.token)) || null;
}

function authorizeWorkspace(principal: ApiPrincipal, requested: string) {
  const workspaceId =
    requested || principal.workspaceIds.find((workspace) => workspace !== "*") || DEFAULT_WORKSPACE_ID;
  const allowed =
    principal.workspaceIds.includes("*") || principal.workspaceIds.includes(workspaceId);
  return { allowed, workspaceId };
}

function allow(request: NextRequest, principal: ApiPrincipal, workspaceId: string) {
  const headers = new Headers(request.headers);
  headers.set("x-aura-auth-subject", principal.subject);
  headers.set("x-aura-auth-role", principal.role);
  headers.set("x-aura-auth-mode", principal.authMode);
  headers.set("x-aura-workspace-id", workspaceId);
  headers.delete("x-aura-api-token");
  headers.delete("authorization");
  return NextResponse.next({ request: { headers } });
}

function deny(status: 401 | 403, code: string, message: string) {
  return NextResponse.json(
    { success: false, error: { code, message, details: "" } },
    { status },
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/") || !isProtected(pathname)) return NextResponse.next();

  if (process.env.DEMO_MODE === "true") {
    return allow(
      request,
      {
        token: "",
        subject: "demo-user",
        role: "admin",
        workspaceIds: ["*"],
        authMode: "demo",
      },
      requestedWorkspace(request) || DEFAULT_WORKSPACE_ID,
    );
  }

  const principals = configuredPrincipals();
  if (principals.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return deny(401, "AUTH_NOT_CONFIGURED", "API authentication is not configured.");
    }
    return allow(
      request,
      {
        token: "",
        subject: "local-developer",
        role: "admin",
        workspaceIds: ["*"],
        authMode: "development_bypass",
      },
      requestedWorkspace(request) || DEFAULT_WORKSPACE_ID,
    );
  }

  const principal = authenticate(request);
  if (!principal) return deny(401, "UNAUTHORIZED", "Authentication required for this endpoint.");

  const role = requiredRole(request);
  if (ROLE_LEVEL[principal.role] < ROLE_LEVEL[role]) {
    return deny(403, "FORBIDDEN", `Role ${role} or higher is required for this endpoint.`);
  }

  const workspace = authorizeWorkspace(principal, requestedWorkspace(request));
  if (!workspace.allowed) {
    return deny(403, "WORKSPACE_FORBIDDEN", "The authenticated identity cannot access this workspace.");
  }

  return allow(request, principal, workspace.workspaceId);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown): AuraRole {
  return value === "viewer" || value === "creator" || value === "operator" || value === "admin"
    ? value
    : "viewer";
}

function normalizeWorkspaceIds(value: unknown) {
  if (!Array.isArray(value)) return [DEFAULT_WORKSPACE_ID];
  const workspaceIds = value.map(cleanString).filter(Boolean);
  return workspaceIds.length ? workspaceIds : [DEFAULT_WORKSPACE_ID];
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export const config = {
  matcher: "/api/:path*",
};
