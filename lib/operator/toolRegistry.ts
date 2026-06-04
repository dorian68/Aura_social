import type { ToolDefinition } from "./types";

const registry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition) {
  registry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return getAllTools().filter((t) => t.category === category);
}

export function getToolNames(): string[] {
  return Array.from(registry.keys());
}

export function getToolsMetadata() {
  return getAllTools().map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
    riskLevel: t.riskLevel,
    inputSchema: t.inputSchema,
    outputSchema: t.outputSchema,
    auditAction: t.auditAction,
  }));
}

export function validateToolArgs(
  toolName: string,
  args: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const tool = getTool(toolName);
  if (!tool) return { valid: false, errors: [`Unknown tool: ${toolName}`] };

  const errors: string[] = [];
  const schema = tool.inputSchema;

  for (const required of schema.required || []) {
    if (args[required] === undefined || args[required] === null || args[required] === "") {
      errors.push(`Missing required argument: ${required}`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    const prop = schema.properties[key];
    if (!prop) continue;
    if (prop.enum && typeof value === "string" && !prop.enum.includes(value)) {
      errors.push(`Argument "${key}" must be one of: ${prop.enum.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
