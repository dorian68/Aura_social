import type { ToolRiskLevel } from "./types";

const DANGEROUS_PATTERNS = [
  /send.*real/i,
  /publish.*live/i,
  /deploy.*contract/i,
  /mint.*live/i,
  /delete/i,
  /expose.*token/i,
  /charge.*real/i,
];

export function isSafeToExecute(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "safe";
}

export function requiresConfirmation(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "confirmation_required";
}

export function isDangerous(riskLevel: ToolRiskLevel): boolean {
  return riskLevel === "dangerous";
}

export function checkMessageForRisk(message: string): {
  blocked: boolean;
  reason?: string;
} {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        reason: `Message matches sensitive pattern: ${pattern.source}`,
      };
    }
  }
  return { blocked: false };
}

export function buildConfirmationPrompt(
  toolName: string,
  args: Record<string, unknown>,
  warning: string,
): string {
  const argSummary = Object.entries(args)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
  return `This action requires confirmation.\n\nTool: ${toolName}\nArgs: ${argSummary}\n\nWarning: ${warning}\n\nReply "confirm" to proceed or "cancel" to abort.`;
}

export function sanitizeArgSummary(args: Record<string, unknown>): string {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (/token|secret|password|key|credential/i.test(key)) {
      safe[key] = "[REDACTED]";
    } else {
      safe[key] = value;
    }
  }
  return JSON.stringify(safe).slice(0, 200);
}
