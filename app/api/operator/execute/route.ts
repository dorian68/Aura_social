import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { executeToolDirect } from "@/lib/operator/operatorOrchestrator";
import { getTool } from "@/lib/operator/toolRegistry";
import { isDangerous, requiresConfirmation } from "@/lib/operator/safety";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request) as {
      tool?: string;
      args?: Record<string, unknown>;
      context?: Record<string, string>;
      confirmed?: boolean;
    };

    if (!body.tool || typeof body.tool !== "string") {
      return fail("OPERATOR_MISSING_TOOL", "tool name is required.", 400);
    }

    const tool = getTool(body.tool);
    if (!tool) {
      return fail("OPERATOR_UNKNOWN_TOOL", `Tool "${body.tool}" is not registered.`, 404);
    }

    if (isDangerous(tool.riskLevel)) {
      return fail("OPERATOR_TOOL_BLOCKED", `Tool "${body.tool}" is dangerous and cannot be executed via API.`, 403);
    }

    if (requiresConfirmation(tool.riskLevel) && !body.confirmed) {
      return fail(
        "OPERATOR_CONFIRMATION_REQUIRED",
        `Tool "${body.tool}" requires explicit confirmation. Resend with confirmed: true.`,
        400,
      );
    }

    const args = body.args || {};
    const context = body.context || {};

    const { result, record } = await executeToolDirect(body.tool, args, context);

    return ok(
      { result, record },
      {
        tool: body.tool,
        category: tool.category,
        riskLevel: tool.riskLevel,
        simulated: result.simulated,
      },
    );
  } catch (err) {
    return handleApiError(err, "OPERATOR_EXECUTE_ERROR");
  }
}
