export type WorkspaceStatus = "active" | "paused";
export type ConnectedAccountProvider = "instagram" | "facebook" | "wallet" | "stripe" | "google_places" | "crm" | "email";
export type ConnectedAccountStatus = "connected" | "mock" | "configuration_required" | "expired" | "disabled";
export type IntegrationKey =
  | "meta_login"
  | "instagram_public_discovery"
  | "instagram_private_insights"
  | "loyalty_engine"
  | "b2b_agent"
  | "google_places"
  | "stripe_payments"
  | "crm_outreach"
  | "blockchain_contracts"
  | "local_persistence";
export type IntegrationStatus = "ready" | "mock_ready" | "missing_config" | "disabled" | "error";
export type AuditSeverity = "info" | "warn" | "error";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "prototype" | "starter" | "growth";
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedAccount {
  id: string;
  workspaceId: string;
  provider: ConnectedAccountProvider;
  externalId: string;
  displayName: string;
  username?: string;
  accountType?: string;
  authProvider?: "instagram" | "facebook";
  status: ConnectedAccountStatus;
  capabilities: string[];
  diagnostics: string[];
  lastConnectedAt: string;
  connectionExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationReadiness {
  key: IntegrationKey;
  label: string;
  status: IntegrationStatus;
  mode: "real" | "mock" | "simulation" | "local" | "future";
  configured: boolean;
  safeMode: boolean;
  requiredConfig: string[];
  missingConfig: string[];
  notes: string[];
  checkedAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorType: "system" | "developer" | "creator" | "agent";
  action: string;
  targetType: string;
  targetId?: string;
  severity: AuditSeverity;
  message: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  connectedAccounts: ConnectedAccount[];
  auditEvents: AuditEvent[];
}
