// Boot tool registry by importing all tool modules
import "./tools/workspaceTools";
import "./tools/loyaltyTools";
import "./tools/fanPassTools";
import "./tools/tokenEconomyTools";
import "./tools/recommendationTools";
import "./tools/b2bAgentTools";
import "./tools/contractTools";
import "./tools/navigationTools";

import { enrichContextWithDefaults } from "./mockOperatorContext";
import { buildConfirmationPrompt, issueConfirmationToken, requiresConfirmation } from "./safety";
import { getTool, getToolsMetadata } from "./toolRegistry";
import { executeTool, type ToolExecutionOptions } from "./toolExecutor";
import { routeIntent } from "./intentRouter";
import {
  collectNextActions,
  collectUIBlocks,
  renderClarificationReply,
  renderErrorReply,
  renderToolReply,
  renderUnknownIntentReply,
} from "./responseRenderer";
import type { OperatorChatRequest, OperatorChatResponse, OperatorContext, ToolCallRecord, ToolResult } from "./types";

export function getRegisteredTools() {
  return getToolsMetadata();
}

export async function handleOperatorChat(request: OperatorChatRequest): Promise<OperatorChatResponse> {
  const context = enrichContextWithDefaults(request.context);
  const message = request.message.trim();

  const route = routeIntent(message);

  if (!route.toolName) {
    return {
      reply: renderUnknownIntentReply(message),
      toolCalls: [],
      uiBlocks: [],
      nextActions: ["getLoyaltyStats", "runPlatformHealthCheck", "runB2BExpansionAgent"],
    };
  }

  if (route.clarificationNeeded && route.clarificationMessage) {
    return {
      reply: renderClarificationReply(route.clarificationMessage),
      toolCalls: [],
      uiBlocks: [],
      nextActions: [],
    };
  }

  const tool = getTool(route.toolName);
  if (!tool) {
    return {
      reply: renderErrorReply(route.toolName, "Tool not found in registry."),
      toolCalls: [],
      uiBlocks: [],
      nextActions: [],
    };
  }

  if (requiresConfirmation(tool.riskLevel)) {
    return {
      reply: buildConfirmationPrompt(route.toolName, route.args, "This action requires confirmation."),
      toolCalls: [],
      uiBlocks: [],
      nextActions: [],
      requiresConfirmation: true,
      confirmationPayload: {
        tool: route.toolName,
        args: route.args,
        warning: "This action requires explicit confirmation before execution.",
        // Single-use token bound to this exact (tool, args). Echo it to /execute to run.
        confirmationToken: issueConfirmationToken(route.toolName, route.args),
      },
    };
  }

  const { result, record } = await executeTool(route.toolName, route.args, context);

  const reply = result.success
    ? renderToolReply(route.toolName, result, route.args)
    : renderErrorReply(route.toolName, result.error || "Unknown error.");

  return {
    reply,
    toolCalls: [record],
    uiBlocks: result.uiBlocks,
    nextActions: collectNextActions([record], [result]),
  };
}

export async function executeToolDirect(
  toolName: string,
  args: Record<string, unknown>,
  context: Partial<OperatorContext> = {},
  options: ToolExecutionOptions = {},
): Promise<{ result: ToolResult; record: ToolCallRecord }> {
  const enrichedContext = enrichContextWithDefaults(context);
  return executeTool(toolName, args, enrichedContext, options);
}

export { getOperatorAuditLog } from "./toolExecutor";
