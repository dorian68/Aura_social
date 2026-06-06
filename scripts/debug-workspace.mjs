import { getLocalPersistenceStatus } from "../lib/storage/localJsonStore.ts";
import { buildWorkspaceSnapshot } from "../lib/workspace/status.ts";
import { getDefaultWorkspaceId, recordAuditEvent } from "../lib/workspace/store.ts";

const workspaceId = getDefaultWorkspaceId();
const snapshotBefore = buildWorkspaceSnapshot();
const debugEvent = recordAuditEvent({
  workspaceId,
  actorType: "developer",
  action: "workspace.debug.ran",
  targetType: "workspace",
  targetId: workspaceId,
  severity: "info",
  message: "Backend-first workspace diagnostic executed.",
  metadata: {
    tokenPrinted: false,
    externalCalls: 0,
  },
});
const snapshot = buildWorkspaceSnapshot();
const persistence = getLocalPersistenceStatus();

const output = {
  script: "debug-workspace",
  success: true,
  workspace: snapshot.workspace,
  connectedAccounts: snapshot.connectedAccounts.map((account) => ({
    provider: account.provider,
    externalId: account.externalId,
    username: account.username,
    status: account.status,
    capabilities: account.capabilities,
    tokenPersisted: false,
    connectionExpiresAt: account.connectionExpiresAt || null,
  })),
  integrations: snapshot.integrations.map((integration) => ({
    key: integration.key,
    label: integration.label,
    status: integration.status,
    mode: integration.mode,
    configured: integration.configured,
    safeMode: integration.safeMode,
    missingConfig: integration.missingConfig,
    notes: integration.notes,
  })),
  persistence: {
    enabled: persistence.enabled,
    mode: persistence.mode,
    directory: persistence.directory,
    files: persistence.files,
  },
  audit: {
    countBefore: snapshotBefore.recentAuditEvents.length,
    eventCreated: {
      id: debugEvent.id,
      action: debugEvent.action,
      metadata: debugEvent.metadata,
    },
    recent: snapshot.recentAuditEvents.slice(0, 5).map((event) => ({
      action: event.action,
      severity: event.severity,
      message: event.message,
      createdAt: event.createdAt,
    })),
  },
};

console.log(JSON.stringify(output, null, 2));
