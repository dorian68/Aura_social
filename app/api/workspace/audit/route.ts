import { fail, ok, readJsonBody } from "@/lib/apiResponse";
import { getAccessContext } from "@/lib/auth/access";
import { getDefaultWorkspaceId, recordAuditEvent } from "@/lib/workspace/store";
import type { AuditSeverity } from "@/lib/workspace/types";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const allowedSeverities = new Set<AuditSeverity>(["info", "warn", "error"]);

export async function POST(request: NextRequest) {
  const access = getAccessContext(request);
  const body = (await readJsonBody(request)) as Record<string, unknown>;
  const action = cleanString(body.action);
  const message = cleanString(body.message);
  const severity = allowedSeverities.has(body.severity as AuditSeverity)
    ? (body.severity as AuditSeverity)
    : "info";

  if (!action || !message) {
    return fail("INVALID_AUDIT_EVENT", "Audit events require action and message.", 400);
  }

  const event = recordAuditEvent({
    workspaceId: access.workspaceId || getDefaultWorkspaceId(),
    actorType: access.role === "creator" ? "creator" : "developer",
    action,
    targetType: cleanString(body.targetType) || "workspace",
    targetId: cleanString(body.targetId),
    severity,
    message,
    metadata: {
      ...sanitizeMetadata(body.metadata),
      authSubject: access.subject,
      authRole: access.role,
      authMode: access.authMode,
    },
  });

  return ok(event);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function sanitizeMetadata(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const metadata: Record<string, string | number | boolean | null> = {};
  for (const [key, rawValue] of Object.entries(source).slice(0, 25)) {
    if (/token|secret|password|private|key/i.test(key)) {
      metadata[key] = Boolean(rawValue);
    } else if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean" || rawValue === null) {
      metadata[key] = rawValue;
    } else {
      metadata[key] = JSON.stringify(rawValue).slice(0, 250);
    }
  }
  return metadata;
}
