import { handleOperatorChat, getOperatorAuditLog } from "../lib/operator/operatorOrchestrator.ts";

const DEMO_CONTEXT = {
  workspaceId: "workspace_aura_demo",
  currentPage: "/dashboard",
  selectedCreatorId: "creator-demo",
};

const SAMPLE_PROMPTS = [
  "Check workspace health",
  "Show loyalty stats",
  "Simulate token economy",
  "Run B2B Expansion Agent in Fort-de-France for restaurants",
  "Generate a DM for my top fans",
  "Explain Token Readiness",
  "Create a reward costing 500 points",
  "List my fan passes",
  "Get contract status",
  "Show me the top 10 fans",
];

const results = [];

for (const prompt of SAMPLE_PROMPTS) {
  try {
    const response = await handleOperatorChat({
      message: prompt,
      context: DEMO_CONTEXT,
    });

    results.push({
      prompt,
      success: true,
      reply: response.reply,
      toolCalls: response.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        category: tc.category,
        riskLevel: tc.riskLevel,
        success: tc.success,
        simulated: tc.simulated,
        durationMs: tc.durationMs,
      })),
      uiBlockTypes: response.uiBlocks.map((b) => b.type),
      nextActions: response.nextActions,
      requiresConfirmation: response.requiresConfirmation || false,
    });
  } catch (err) {
    results.push({
      prompt,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const auditLog = getOperatorAuditLog();

const output = {
  script: "debug-operator",
  success: true,
  context: DEMO_CONTEXT,
  promptResults: results,
  summary: {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    clarifications: results.filter((r) => r.requiresConfirmation).length,
  },
  auditEvents: auditLog.slice(0, 10).map((e) => ({
    toolName: e.toolName,
    category: e.category,
    success: e.success,
    simulated: e.simulated,
    durationMs: e.durationMs,
    timestamp: e.timestamp,
  })),
};

console.log(JSON.stringify(output, null, 2));
