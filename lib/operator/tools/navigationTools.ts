import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

const ROUTE_MAP: Record<string, { path: string; label: string; section?: string }> = {
  dashboard: { path: "/dashboard", label: "Main Dashboard" },
  "loyalty-dashboard": { path: "/dashboard", label: "Loyalty Dashboard", section: "loyalty" },
  "token-economy": { path: "/dashboard", label: "Token Economy Simulator", section: "token-economy" },
  "b2b-agent": { path: "/dashboard", label: "B2B Growth Engine", section: "b2b" },
  workspace: { path: "/dashboard", label: "Workspace Control Plane", section: "workspace" },
  "fan-passes": { path: "/dashboard", label: "Fan Passes", section: "fan-passes" },
  rewards: { path: "/dashboard", label: "Rewards", section: "rewards" },
  recommendations: { path: "/dashboard", label: "Agent Recommendations", section: "recommendations" },
  contracts: { path: "/dashboard", label: "Smart Contracts", section: "contracts" },
  analyzer: { path: "/", label: "Instagram Analyzer" },
  health: { path: "/dashboard", label: "Platform Health", section: "health" },
};

function resolveRoute(query: string): typeof ROUTE_MAP[string] | null {
  const q = query.toLowerCase();
  for (const [key, route] of Object.entries(ROUTE_MAP)) {
    if (q.includes(key) || q.includes(route.label.toLowerCase())) {
      return route;
    }
  }
  return null;
}

registerTool({
  name: "navigateTo",
  description: "Navigates the user to a specific section of the Aura dashboard.",
  category: "navigation",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      destination: {
        type: "string",
        description: "Where to navigate (e.g. token-economy, b2b-agent, workspace, fan-passes)",
        enum: Object.keys(ROUTE_MAP),
      },
    },
    required: ["destination"],
  },
  outputSchema: { description: "Navigation action result", uiBlock: "tool_result" },
  auditAction: "operator.navigation.navigateTo",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const destination = String(input.destination || "");
    const route = ROUTE_MAP[destination] || resolveRoute(destination);
    if (!route) {
      return {
        success: false,
        error: `Unknown destination: ${destination}`,
        simulated: false,
        uiBlocks: [],
        nextActions: ["openDashboardPanel"],
      };
    }

    return {
      success: true,
      simulated: false,
      data: { path: route.path, section: route.section, label: route.label },
      uiBlocks: [
        {
          type: "tool_result",
          title: `Navigate to ${route.label}`,
          data: {
            action: "navigate",
            path: route.path,
            section: route.section || null,
            label: route.label,
            instruction: `Opening ${route.label}…`,
          },
        },
      ],
      nextActions: [],
    };
  },
});

registerTool({
  name: "openDashboardPanel",
  description: "Opens a specific panel or section in the Aura dashboard.",
  category: "navigation",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      panel: {
        type: "string",
        description: "Panel to open",
        enum: ["loyalty", "token-economy", "b2b", "workspace", "fan-passes", "rewards", "recommendations", "contracts", "health"],
      },
    },
    required: ["panel"],
  },
  outputSchema: { description: "Panel open action", uiBlock: "tool_result" },
  auditAction: "operator.navigation.openPanel",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const panel = String(input.panel || "");
    return {
      success: true,
      simulated: false,
      data: { panel },
      uiBlocks: [
        {
          type: "tool_result",
          title: `Open Panel: ${panel}`,
          data: {
            action: "open_panel",
            panel,
            instruction: `Scrolling to ${panel} panel…`,
          },
        },
      ],
      nextActions: [],
    };
  },
});

registerTool({
  name: "highlightSection",
  description: "Highlights a UI section to draw the user's attention.",
  category: "navigation",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      section: { type: "string", description: "Section ID or name to highlight" },
    },
    required: ["section"],
  },
  outputSchema: { description: "Highlight action", uiBlock: "tool_result" },
  auditAction: "operator.navigation.highlight",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const section = String(input.section || "");
    return {
      success: true,
      simulated: false,
      data: { section },
      uiBlocks: [
        {
          type: "tool_result",
          title: `Highlight: ${section}`,
          data: {
            action: "highlight_section",
            section,
          },
        },
      ],
      nextActions: [],
    };
  },
});

registerTool({
  name: "showUIBlock",
  description: "Shows a specific UI block or widget in the dashboard.",
  category: "navigation",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      blockType: {
        type: "string",
        description: "UI block type to display",
        enum: ["kpi", "action_plan", "health_status", "token_economy", "b2b_opportunity", "reward_card", "fan_pass"],
      },
    },
    required: ["blockType"],
  },
  outputSchema: { description: "Show UI block action", uiBlock: "tool_result" },
  auditAction: "operator.navigation.showBlock",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const blockType = String(input.blockType || "");
    return {
      success: true,
      simulated: false,
      data: { blockType },
      uiBlocks: [
        {
          type: "tool_result",
          title: `Show ${blockType}`,
          data: { action: "show_block", blockType },
        },
      ],
      nextActions: [],
    };
  },
});
