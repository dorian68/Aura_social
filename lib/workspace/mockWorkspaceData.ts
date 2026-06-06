import type { WorkspaceState } from "./types";

const now = "2026-06-04T08:00:00.000Z";

export function createDefaultWorkspaceState(): WorkspaceState {
  return {
    workspaces: [
      {
        id: "workspace_aura_demo",
        name: "Aura Prototype Workspace",
        slug: "aura-prototype",
        plan: "prototype",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    connectedAccounts: [],
    auditEvents: [
      {
        id: "audit_workspace_seeded",
        workspaceId: "workspace_aura_demo",
        actorType: "system",
        action: "workspace.seeded",
        targetType: "workspace",
        targetId: "workspace_aura_demo",
        severity: "info",
        message: "Default Aura prototype workspace initialized.",
        metadata: {
          safeMode: true,
        },
        createdAt: now,
      },
    ],
  };
}
