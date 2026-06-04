import { buildWorkspaceSnapshot } from "@/lib/workspace/status";
import { recordAuditEvent } from "@/lib/workspace/store";
import { registerTool } from "../toolRegistry";
import type { ToolResult, UIBlock } from "../types";

registerTool({
  name: "getWorkspaceState",
  description: "Returns the current workspace state: connected accounts, plan, status.",
  category: "workspace",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Workspace state snapshot", uiBlock: "health_status" },
  auditAction: "operator.workspace.getState",
  async execute(_input, context): Promise<ToolResult> {
    const snapshot = buildWorkspaceSnapshot();
    const workspace = snapshot.workspace;
    return {
      success: true,
      simulated: false,
      data: { workspace },
      uiBlocks: [
        {
          type: "health_status",
          title: "Workspace State",
          data: {
            name: workspace?.name || "Aura Demo",
            plan: workspace?.plan || "prototype",
            status: workspace?.status || "active",
            connectedAccountsCount: snapshot.connectedAccounts.length,
          },
        },
      ],
      nextActions: ["getIntegrationHealth", "getAuditTrail", "runPlatformHealthCheck"],
    };
  },
});

registerTool({
  name: "getIntegrationHealth",
  description: "Returns the health and readiness of all platform integrations.",
  category: "workspace",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Integration readiness list", uiBlock: "health_status" },
  auditAction: "operator.workspace.getIntegrationHealth",
  async execute(_input, _context): Promise<ToolResult> {
    const snapshot = buildWorkspaceSnapshot();
    const integrations = snapshot.integrations;
    const ready = integrations.filter((i) => i.status === "ready" || i.status === "mock_ready").length;
    const issues = integrations.filter((i) => i.status === "error" || i.status === "missing_config");

    const uiBlocks: UIBlock[] = [
      {
        type: "health_status",
        title: "Integration Health",
        data: {
          total: integrations.length,
          ready,
          issues: issues.length,
          integrations: integrations.map((i) => ({
            key: i.key,
            label: i.label,
            status: i.status,
            mode: i.mode,
            safeMode: i.safeMode,
          })),
        },
      },
    ];

    if (issues.length > 0) {
      uiBlocks.push({
        type: "action_plan",
        title: "Integration Issues",
        data: {
          items: issues.map((i) => ({
            label: i.label,
            action: `Configure: ${i.missingConfig.join(", ") || "review settings"}`,
          })),
        },
      });
    }

    return {
      success: true,
      simulated: false,
      data: { integrations, ready, issueCount: issues.length },
      uiBlocks,
      nextActions: ["getWorkspaceState", "getAuditTrail"],
    };
  },
});

registerTool({
  name: "getAuditTrail",
  description: "Returns recent audit events from the workspace.",
  category: "workspace",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Number of events to return (default 10)", default: 10 },
    },
  },
  outputSchema: { description: "Recent audit events", uiBlock: "audit_event" },
  auditAction: "operator.workspace.getAuditTrail",
  async execute(input: { limit?: number }, _context): Promise<ToolResult> {
    const snapshot = buildWorkspaceSnapshot();
    const limit = input.limit || 10;
    const events = snapshot.recentAuditEvents.slice(0, limit);
    return {
      success: true,
      simulated: false,
      data: { events, total: events.length },
      uiBlocks: [
        {
          type: "audit_event",
          title: "Recent Audit Events",
          data: { events: events.slice(0, 5) },
        },
      ],
      nextActions: ["getIntegrationHealth"],
    };
  },
});

registerTool({
  name: "runPlatformHealthCheck",
  description: "Runs a comprehensive health check of the entire Aura platform.",
  category: "workspace",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Platform health report", uiBlock: "health_status" },
  auditAction: "operator.workspace.healthCheck",
  async execute(_input, context): Promise<ToolResult> {
    const snapshot = buildWorkspaceSnapshot();
    const integrations = snapshot.integrations;
    const ready = integrations.filter((i) => i.status === "ready" || i.status === "mock_ready");
    const issues = integrations.filter((i) => i.status === "error" || i.status === "missing_config");
    const score = Math.round((ready.length / integrations.length) * 100);

    recordAuditEvent({
      workspaceId: context.workspaceId || "workspace_aura_demo",
      actorType: "agent",
      action: "operator.workspace.healthCheck",
      targetType: "workspace",
      targetId: context.workspaceId || "workspace_aura_demo",
      severity: issues.length > 0 ? "warn" : "info",
      message: `Platform health check: ${score}% ready. ${issues.length} issue(s) detected.`,
      metadata: {
        readyCount: ready.length,
        issueCount: issues.length,
        score,
        tokenPrinted: false,
      },
    });

    return {
      success: true,
      simulated: false,
      data: { score, ready: ready.length, issues: issues.length, integrations },
      uiBlocks: [
        {
          type: "health_status",
          title: "Platform Health",
          data: {
            score,
            ready: ready.length,
            issues: issues.length,
            total: integrations.length,
            status: issues.length === 0 ? "healthy" : "degraded",
            connectedAccounts: snapshot.connectedAccounts.length,
            recentEvents: snapshot.recentAuditEvents.length,
          },
        },
        {
          type: "kpi",
          title: "Health KPIs",
          data: {
            metrics: [
              { label: "Health Score", value: `${score}%`, trend: score >= 80 ? "up" : "down" },
              { label: "Active Integrations", value: String(ready.length) },
              { label: "Issues", value: String(issues.length) },
              { label: "Connected Accounts", value: String(snapshot.connectedAccounts.length) },
            ],
          },
        },
      ],
      nextActions: ["getIntegrationHealth", "getAuditTrail", "getLoyaltyStats"],
    };
  },
});
