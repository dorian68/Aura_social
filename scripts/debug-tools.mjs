import { getRegisteredTools, executeToolDirect } from "../lib/operator/operatorOrchestrator.ts";

const tools = getRegisteredTools();

const validationResults = [];
for (const tool of tools) {
  const issues = [];
  if (!tool.name) issues.push("missing name");
  if (!tool.description) issues.push("missing description");
  if (!tool.category) issues.push("missing category");
  if (!tool.riskLevel) issues.push("missing riskLevel");
  if (!tool.inputSchema) issues.push("missing inputSchema");
  if (!tool.outputSchema) issues.push("missing outputSchema");
  if (!tool.auditAction) issues.push("missing auditAction");
  validationResults.push({ tool: tool.name, issues, valid: issues.length === 0 });
}

const byCategory = {};
for (const tool of tools) {
  if (!byCategory[tool.category]) byCategory[tool.category] = [];
  byCategory[tool.category].push(tool.name);
}

const SAMPLE_SAFE_TOOLS = [
  { toolName: "getWorkspaceState", args: {} },
  { toolName: "getLoyaltyStats", args: {} },
  { toolName: "getTokenEconomyState", args: {} },
  { toolName: "listRewards", args: {} },
  { toolName: "getContractStatus", args: {} },
];

const sampleResults = [];
for (const { toolName, args } of SAMPLE_SAFE_TOOLS) {
  try {
    const { result } = await executeToolDirect(toolName, args, { workspaceId: "workspace_aura_demo" });
    sampleResults.push({
      tool: toolName,
      success: result.success,
      simulated: result.simulated,
      uiBlockTypes: result.uiBlocks.map((b) => b.type),
      nextActions: result.nextActions,
      error: result.error || null,
    });
  } catch (err) {
    sampleResults.push({
      tool: toolName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const output = {
  script: "debug-tools",
  success: true,
  summary: {
    totalTools: tools.length,
    validTools: validationResults.filter((v) => v.valid).length,
    invalidTools: validationResults.filter((v) => !v.valid).length,
    categories: Object.keys(byCategory).length,
  },
  toolsByCategory: byCategory,
  validation: validationResults,
  sampleExecutions: sampleResults,
};

console.log(JSON.stringify(output, null, 2));
