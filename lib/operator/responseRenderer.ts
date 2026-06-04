import type { ToolCallRecord, ToolResult, UIBlock } from "./types";

const TOOL_REPLY_TEMPLATES: Record<string, (result: ToolResult, args: Record<string, unknown>) => string> = {
  runPlatformHealthCheck: (r) => {
    const d = r.data as { score?: number; ready?: number; issues?: number } | undefined;
    if (!d) return "Platform health check completed.";
    return `Platform health: ${d.score}% — ${d.ready} integrations ready, ${d.issues} issue(s) detected.${d.issues === 0 ? " Everything looks good." : " Check the health report for details."}`;
  },
  getWorkspaceState: (r) => {
    const d = r.data as { workspace?: { name?: string; plan?: string; status?: string } } | undefined;
    return `Workspace "${d?.workspace?.name || "Aura Demo"}" — Plan: ${d?.workspace?.plan || "prototype"}, Status: ${d?.workspace?.status || "active"}.`;
  },
  getIntegrationHealth: (r) => {
    const d = r.data as { ready?: number; issueCount?: number } | undefined;
    return `${d?.ready || 0} integrations are ready. ${d?.issueCount || 0} issue(s) detected.`;
  },
  getAuditTrail: (r) => {
    const d = r.data as { total?: number } | undefined;
    return `Showing ${d?.total || 0} recent audit events.`;
  },
  getLoyaltyStats: (r) => {
    const d = r.data as { stats?: { activeFans?: number; totalPointsIssued?: number } } | undefined;
    return `Loyalty program: ${d?.stats?.activeFans || 0} active fans, ${(d?.stats?.totalPointsIssued || 0).toLocaleString()} points issued.`;
  },
  getTopFans: (r) => {
    const d = r.data as { count?: number } | undefined;
    return `Found ${d?.count || 0} top fans ranked by points and tier.`;
  },
  listRewards: (r) => {
    const d = r.data as { count?: number } | undefined;
    return `${d?.count || 0} reward(s) in your loyalty program.`;
  },
  createReward: (r, args) => {
    const d = r.data as { reward?: { name?: string; costInPoints?: number } } | undefined;
    return `Reward "${d?.reward?.name || args.name}" created at ${d?.reward?.costInPoints || args.costInPoints} points.`;
  },
  simulateRewardRedemption: (r) => {
    const d = r.data as { eligible?: boolean; fan?: { displayName?: string }; reward?: { name?: string } } | undefined;
    return `[SIMULATION] ${d?.fan?.displayName || "Fan"} is ${d?.eligible ? "eligible" : "not eligible"} to redeem "${d?.reward?.name || "reward"}".`;
  },
  simulatePointsAward: (r, args) => {
    return `[SIMULATION] ${args.points} points awarded to top fan.`;
  },
  createPointsRule: (r, args) => {
    return `Points rule created: ${args.actionType} earns ${args.points} points.`;
  },
  listFanPasses: (r) => {
    const d = r.data as { count?: number } | undefined;
    return `${d?.count || 0} fan pass(es) in your program.`;
  },
  createFanPass: (r) => {
    const d = r.data as { pass?: { name?: string; tier?: string; price?: number } } | undefined;
    return `Fan pass "${d?.pass?.name}" (${d?.pass?.tier}) created at €${d?.pass?.price}.`;
  },
  simulateFanPassLaunch: (r) => {
    const d = r.data as { simulation?: { estimatedPassHolders?: number; estimatedRevenue?: number } } | undefined;
    return `[SIMULATION] Projected ${d?.simulation?.estimatedPassHolders || 0} holders and €${d?.simulation?.estimatedRevenue?.toFixed(2) || 0} revenue.`;
  },
  getTokenEconomyState: (r) => {
    const d = r.data as { readiness?: { score?: number; label?: string } } | undefined;
    return `Token economy: Readiness score ${d?.readiness?.score || 0}/100 — ${d?.readiness?.label || ""}.`;
  },
  simulateTokenEconomy: (r) => {
    const d = r.data as { airdropSim?: { enoughPool?: boolean }; rewardsSim?: { monthsCovered?: number } } | undefined;
    return `[SIMULATION] Airdrop viable: ${d?.airdropSim?.enoughPool ? "Yes" : "No"}. Rewards runway: ${d?.rewardsSim?.monthsCovered || 0} months.`;
  },
  analyzeTokenEconomyRisk: (r) => {
    const d = r.data as { risks?: string[] } | undefined;
    return d?.risks?.length === 0
      ? "Token economy risk: Low. No critical issues found."
      : `Token economy risks: ${d?.risks?.length || 0} issue(s) detected.`;
  },
  explainTokenReadiness: (r) => {
    const d = r.data as { readiness?: { score?: number; label?: string } } | undefined;
    return `Token Readiness score: ${d?.readiness?.score || 0}/100 — ${d?.readiness?.label || ""}. See the explanation block below.`;
  },
  generateRecommendations: (r) => {
    const d = r.data as { recommendations?: Array<unknown> } | undefined;
    return `Generated ${d?.recommendations?.length || 0} recommendations for your loyalty program.`;
  },
  generateCampaignDraft: () => "[SIMULATION] Campaign draft generated. Content is ready for review and approval.",
  generateDMDraft: (r) => {
    const d = r.data as { count?: number } | undefined;
    return `[SIMULATION] ${d?.count || 0} DM draft(s) generated for your top fans. Requires approval before sending.`;
  },
  explainRecommendation: (r) => {
    const d = r.data as { recommendation?: { title?: string } } | undefined;
    return `Explanation for: "${d?.recommendation?.title || "recommendation"}". See the detail block below.`;
  },
  runB2BExpansionAgent: (r) => {
    const d = r.data as { run?: { businessesDiscovered?: number; opportunitiesGenerated?: number; location?: string } } | undefined;
    return `[SIMULATION] B2B agent ran in ${d?.run?.location || ""}. Found ${d?.run?.businessesDiscovered || 0} businesses and generated ${d?.run?.opportunitiesGenerated || 0} opportunities.`;
  },
  discoverLocalBusinesses: (r) => {
    const d = r.data as { count?: number; location?: string } | undefined;
    return `[SIMULATION] Discovered ${d?.count || 0} businesses in ${d?.location || ""}.`;
  },
  scoreBusinessFit: (r) => {
    const d = r.data as { count?: number } | undefined;
    return `[SIMULATION] Scored ${d?.count || 0} businesses for audience fit.`;
  },
  generatePartnershipPitch: () => "[SIMULATION] Partnership pitch generated. Requires approval before sending.",
  simulateSMEPayment: (r) => {
    const d = r.data as { payment?: { campaignBudget?: number; platformCommission?: number } } | undefined;
    return `[SIMULATION] Campaign budget: €${d?.payment?.campaignBudget || 0}. Aura commission: €${d?.payment?.platformCommission?.toFixed(2) || 0}.`;
  },
  getContractStatus: (r) => {
    const d = r.data as { abiReady?: boolean; status?: { mode?: string } } | undefined;
    return `Contracts: ${d?.abiReady ? "ABIs loaded" : "ABIs missing"}. Mode: ${d?.status?.mode || "local"}.`;
  },
  runContractDiagnostics: (r) => {
    const d = r.data as { contracts?: Array<{ name: string; status: string }> } | undefined;
    return `Contract diagnostics: ${d?.contracts?.map((c) => `${c.name} (${c.status})`).join(", ") || "—"}.`;
  },
  explainContractArchitecture: () => "Contract architecture explained. See the detail block below.",
  simulateMintPoints: (r) => {
    const d = r.data as { action?: { message?: string } } | undefined;
    return `[SIMULATION] ${d?.action?.message || "Points minted in mock mode."}`;
  },
  simulateMintFanPass: (r) => {
    const d = r.data as { action?: { message?: string } } | undefined;
    return `[SIMULATION] ${d?.action?.message || "Fan pass minted in mock mode."}`;
  },
  navigateTo: (r) => {
    const d = r.data as { label?: string } | undefined;
    return `Navigating to ${d?.label || "dashboard"}…`;
  },
  openDashboardPanel: (r) => {
    const d = r.data as { panel?: string } | undefined;
    return `Opening ${d?.panel || ""} panel…`;
  },
  highlightSection: (r) => {
    const d = r.data as { section?: string } | undefined;
    return `Highlighting section: ${d?.section || ""}`;
  },
  showUIBlock: (r) => {
    const d = r.data as { blockType?: string } | undefined;
    return `Showing ${d?.blockType || "block"}…`;
  },
};

export function renderToolReply(
  toolName: string,
  result: ToolResult,
  args: Record<string, unknown>,
): string {
  const template = TOOL_REPLY_TEMPLATES[toolName];
  if (template) return template(result, args);
  return result.success
    ? `${toolName} completed successfully.`
    : `${toolName} failed: ${result.error || "Unknown error."}`;
}

export function renderErrorReply(toolName: string, error: string): string {
  return `I couldn't complete "${toolName}": ${error}`;
}

export function renderUnknownIntentReply(message: string): string {
  const suggestions = [
    "Check workspace health",
    "Show loyalty stats",
    "Run B2B Expansion Agent",
    "Simulate token economy",
    "List my rewards",
    "Generate a DM for my top fans",
    "Explain Token Readiness",
  ];
  return `I didn't understand "${message}". Here are things I can help with:\n\n${suggestions.map((s) => `• ${s}`).join("\n")}`;
}

export function renderClarificationReply(clarification: string): string {
  return clarification;
}

export function collectUIBlocks(toolCalls: { result: ToolResult }[]): UIBlock[] {
  return toolCalls.flatMap((tc) => tc.result.uiBlocks);
}

export function collectNextActions(toolCalls: ToolCallRecord[], results: ToolResult[]): string[] {
  const seen = new Set<string>();
  const actions: string[] = [];
  for (const result of results) {
    for (const action of result.nextActions) {
      if (!seen.has(action) && !toolCalls.some((tc) => tc.toolName === action)) {
        seen.add(action);
        actions.push(action);
      }
    }
  }
  return actions.slice(0, 4);
}
