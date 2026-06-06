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

const MAX_ARG_STRING_LENGTH = 4_000;
const MAX_ARG_ARRAY_LENGTH = 200;
const MAX_ABS_NUMBER = 1e12;

/**
 * Strict argument validation. Beyond required-presence and enum membership,
 * this now enforces declared types, numeric finiteness/bounds, string length,
 * array bounds, and rejects unknown arguments — so loosely-coerced tool inputs
 * (e.g. `Number(input.amount)`) can no longer receive NaN/Infinity/oversized or
 * unexpected values that flow into side-effecting calls.
 */
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
    if (!prop) {
      errors.push(`Unexpected argument: "${key}"`);
      continue;
    }
    if (value === undefined || value === null) continue;

    switch (prop.type) {
      case "number": {
        const num = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
        if (!Number.isFinite(num)) errors.push(`Argument "${key}" must be a finite number.`);
        else if (Math.abs(num) > MAX_ABS_NUMBER) errors.push(`Argument "${key}" is out of range.`);
        break;
      }
      case "boolean": {
        if (typeof value !== "boolean" && value !== "true" && value !== "false") {
          errors.push(`Argument "${key}" must be a boolean.`);
        }
        break;
      }
      case "array": {
        if (!Array.isArray(value)) errors.push(`Argument "${key}" must be an array.`);
        else if (value.length > MAX_ARG_ARRAY_LENGTH) errors.push(`Argument "${key}" has too many items.`);
        break;
      }
      case "string":
      default: {
        if (typeof value !== "string") errors.push(`Argument "${key}" must be a string.`);
        else if (value.length > MAX_ARG_STRING_LENGTH) errors.push(`Argument "${key}" exceeds maximum length.`);
        else if (prop.enum && !prop.enum.includes(value)) errors.push(`Argument "${key}" must be one of: ${prop.enum.join(", ")}`);
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
