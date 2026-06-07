import crypto from "node:crypto";
import {
  getPersistenceMode,
  readPersistedState,
  resetPersistedState,
  writePersistedState,
} from "@/lib/storage/localJsonStore";
import { createDefaultWorkspaceState } from "./mockWorkspaceData";
import type { AuditEvent, ConnectedAccount, WorkspaceState } from "./types";

const WORKSPACE_STATE_FILE = "workspace-state.json";

const globalForWorkspace = globalThis as typeof globalThis & {
  __auraWorkspaceState?: WorkspaceState;
  __auraWorkspaceRevision?: number;
};

export function getWorkspaceState(): WorkspaceState {
  if (!globalForWorkspace.__auraWorkspaceState || getPersistenceMode() === "sqlite") {
    const persisted = readPersistedState(WORKSPACE_STATE_FILE, createDefaultWorkspaceState);
    globalForWorkspace.__auraWorkspaceState = persisted.value;
    globalForWorkspace.__auraWorkspaceRevision = persisted.revision;
  }
  return globalForWorkspace.__auraWorkspaceState;
}

export function setWorkspaceState(nextState: WorkspaceState) {
  getWorkspaceState();
  const nextRevision = writePersistedState(
    WORKSPACE_STATE_FILE,
    nextState,
    globalForWorkspace.__auraWorkspaceRevision || 0,
  );
  globalForWorkspace.__auraWorkspaceState = nextState;
  globalForWorkspace.__auraWorkspaceRevision = nextRevision;
}

export function resetWorkspaceState() {
  const persisted = resetPersistedState(
    WORKSPACE_STATE_FILE,
    createDefaultWorkspaceState,
  );
  globalForWorkspace.__auraWorkspaceState = persisted.value;
  globalForWorkspace.__auraWorkspaceRevision = persisted.revision;
  return globalForWorkspace.__auraWorkspaceState;
}

export function getDefaultWorkspaceId() {
  return getWorkspaceState().workspaces[0]?.id || "workspace_aura_demo";
}

export function upsertConnectedAccount(input: Omit<ConnectedAccount, "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const current = getWorkspaceState();
  const existing = current.connectedAccounts.find((account) => account.id === input.id);
  const nextAccount: ConnectedAccount = {
    ...input,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const connectedAccounts = existing
    ? current.connectedAccounts.map((account) => (account.id === input.id ? nextAccount : account))
    : [nextAccount, ...current.connectedAccounts];

  setWorkspaceState({
    ...current,
    connectedAccounts,
  });

  return nextAccount;
}

export function recordAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">) {
  const event: AuditEvent = {
    ...input,
    id: `audit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    metadata: sanitizeMetadata(input.metadata),
  };

  const current = getWorkspaceState();
  setWorkspaceState({
    ...current,
    auditEvents: [event, ...current.auditEvents].slice(0, 250),
  });

  return event;
}

export function recordMetaConnectedAccounts(
  accounts: Array<{
    igUserId: string;
    username: string;
    name: string;
    followersCount: number | null;
    mediaCount: number | null;
    pageId: string | null;
    pageName: string;
    authProvider: "instagram" | "facebook";
  }>,
  input: { connectionExpiresAt: number; authProvider: "instagram" | "facebook" },
) {
  const workspaceId = getDefaultWorkspaceId();
  const expiresAt = new Date(input.connectionExpiresAt).toISOString();

  const stored = accounts.map((account) =>
    upsertConnectedAccount({
      id: `instagram_${account.igUserId}`,
      workspaceId,
      provider: "instagram",
      externalId: account.igUserId,
      displayName: account.name || account.username || "Instagram account",
      username: account.username ? `@${account.username.replace(/^@/, "")}` : "",
      accountType: "instagram_business_or_creator",
      authProvider: account.authProvider,
      status: isMockMetaAccount(account) ? "mock" : "connected",
      capabilities: buildMetaCapabilities(account.authProvider),
      diagnostics: [
        ...(isMockMetaAccount(account) ? ["mock_meta_connection"] : []),
        account.followersCount === null ? "followers_count_unavailable" : "followers_count_available",
        account.mediaCount === null ? "media_count_unavailable" : "media_count_available",
        account.pageId ? "linked_facebook_page_detected" : "instagram_login_direct",
      ],
      lastConnectedAt: new Date().toISOString(),
      connectionExpiresAt: expiresAt,
    }),
  );

  recordAuditEvent({
    workspaceId,
    actorType: "system",
    action: "meta.accounts_connected",
    targetType: "instagram_account",
    targetId: stored[0]?.externalId || "",
    severity: "info",
    message: `${stored.length} Instagram account metadata record(s) updated. Tokens remain in memory only.`,
    metadata: {
      accountCount: stored.length,
      authProvider: input.authProvider,
      tokenPersisted: false,
    },
  });

  return stored;
}

function isMockMetaAccount(account: { igUserId: string; username: string }) {
  return account.igUserId.startsWith("mock-") || account.username === "aura.demo";
}

function buildMetaCapabilities(authProvider: "instagram" | "facebook") {
  const shared = ["private_insights", "media_insights", "owned_account_dashboard"];
  return authProvider === "facebook"
    ? [...shared, "business_discovery_source", "facebook_page_linkage"]
    : shared;
}

function sanitizeMetadata(metadata: Record<string, string | number | boolean | null>) {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata || {})) {
    if (/token|secret|password|private|key/i.test(key)) {
      sanitized[key] = Boolean(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
