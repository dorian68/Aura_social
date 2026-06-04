import crypto from "node:crypto";
import { recordAuditEvent } from "@/lib/workspace/store";
import { sanitizeArgSummary } from "./safety";
import { getTool, validateToolArgs } from "./toolRegistry";
import type { OperatorAuditEvent, OperatorContext, ToolCallRecord, ToolResult } from "./types";

const operatorAuditLog: OperatorAuditEvent[] = [];

export function getOperatorAuditLog(): OperatorAuditEvent[] {
  return [...operatorAuditLog];
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: OperatorContext,
): Promise<{ result: ToolResult; record: ToolCallRecord }> {
  const tool = getTool(toolName);
  if (!tool) {
    const record: ToolCallRecord = {
      toolName,
      category: "workspace",
      riskLevel: "safe",
      args,
      success: false,
      simulated: false,
      durationMs: 0,
    };
    return {
      result: {
        success: false,
        error: `Tool "${toolName}" not found in registry.`,
        simulated: false,
        uiBlocks: [],
        nextActions: [],
      },
      record,
    };
  }

  const validation = validateToolArgs(toolName, args);
  if (!validation.valid) {
    const record: ToolCallRecord = {
      toolName,
      category: tool.category,
      riskLevel: tool.riskLevel,
      args,
      success: false,
      simulated: false,
      durationMs: 0,
    };
    return {
      result: {
        success: false,
        error: `Invalid arguments: ${validation.errors.join("; ")}`,
        simulated: false,
        uiBlocks: [],
        nextActions: [],
      },
      record,
    };
  }

  const startMs = Date.now();
  let result: ToolResult;

  try {
    result = await tool.execute(args, context);
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : "Unexpected error during tool execution.";
    const record: ToolCallRecord = {
      toolName,
      category: tool.category,
      riskLevel: tool.riskLevel,
      args,
      success: false,
      simulated: false,
      durationMs,
    };

    logToolAuditEvent({
      toolName,
      category: tool.category,
      riskLevel: tool.riskLevel,
      args,
      success: false,
      simulated: false,
      durationMs,
      workspaceId: context.workspaceId,
      auditAction: tool.auditAction,
      errorMessage,
    });

    return {
      result: {
        success: false,
        error: errorMessage,
        simulated: false,
        uiBlocks: [],
        nextActions: [],
      },
      record,
    };
  }

  const durationMs = Date.now() - startMs;
  const record: ToolCallRecord = {
    toolName,
    category: tool.category,
    riskLevel: tool.riskLevel,
    args,
    success: result.success,
    simulated: result.simulated,
    durationMs,
  };

  logToolAuditEvent({
    toolName,
    category: tool.category,
    riskLevel: tool.riskLevel,
    args,
    success: result.success,
    simulated: result.simulated,
    durationMs,
    workspaceId: context.workspaceId,
    auditAction: tool.auditAction,
  });

  return { result, record };
}

function logToolAuditEvent(params: {
  toolName: string;
  category: string;
  riskLevel: string;
  args: Record<string, unknown>;
  success: boolean;
  simulated: boolean;
  durationMs: number;
  workspaceId?: string;
  auditAction: string;
  errorMessage?: string;
}) {
  const event: OperatorAuditEvent = {
    id: `op_audit_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    toolName: params.toolName,
    category: params.category as never,
    riskLevel: params.riskLevel as never,
    argsSummary: sanitizeArgSummary(params.args),
    success: params.success,
    simulated: params.simulated,
    durationMs: params.durationMs,
    workspaceId: params.workspaceId,
  };

  operatorAuditLog.unshift(event);
  if (operatorAuditLog.length > 100) operatorAuditLog.pop();

  try {
    recordAuditEvent({
      workspaceId: params.workspaceId || "workspace_aura_demo",
      actorType: "agent",
      action: params.auditAction,
      targetType: "operator_tool",
      targetId: params.toolName,
      severity: params.success ? "info" : "warn",
      message: `Operator tool "${params.toolName}" ${params.success ? "succeeded" : "failed"}. Simulated: ${params.simulated}. Duration: ${params.durationMs}ms.${params.errorMessage ? ` Error: ${params.errorMessage}` : ""}`,
      metadata: {
        toolName: params.toolName,
        category: params.category,
        riskLevel: params.riskLevel,
        simulated: params.simulated,
        durationMs: params.durationMs,
        tokenPrinted: false,
      },
    });
  } catch {
    // workspace audit is best-effort
  }
}
