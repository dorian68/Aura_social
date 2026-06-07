import type { NextRequest } from "next/server";

export type AuraRole = "viewer" | "creator" | "operator" | "admin";

export interface AuraAccessContext {
  subject: string;
  role: AuraRole;
  workspaceId: string;
  authMode: "api_key" | "legacy_admin_token" | "demo" | "development_bypass";
}

const DEFAULT_WORKSPACE_ID = "workspace_aura_demo";

export function getAccessContext(request: NextRequest | Request): AuraAccessContext {
  return {
    subject: request.headers.get("x-aura-auth-subject") || "anonymous",
    role: normalizeRole(request.headers.get("x-aura-auth-role")),
    workspaceId: request.headers.get("x-aura-workspace-id") || DEFAULT_WORKSPACE_ID,
    authMode: normalizeAuthMode(request.headers.get("x-aura-auth-mode")),
  };
}

function normalizeRole(value: string | null): AuraRole {
  if (value === "viewer" || value === "creator" || value === "operator" || value === "admin") {
    return value;
  }
  return "viewer";
}

function normalizeAuthMode(value: string | null): AuraAccessContext["authMode"] {
  if (
    value === "api_key" ||
    value === "legacy_admin_token" ||
    value === "demo" ||
    value === "development_bypass"
  ) {
    return value;
  }
  return "api_key";
}
