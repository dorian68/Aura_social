import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { executeToolDirect } from "@/lib/operator/operatorOrchestrator";
import { getTool } from "@/lib/operator/toolRegistry";
import { isDangerous, issueConfirmationToken, requiresConfirmation } from "@/lib/operator/safety";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return fail("OPERATOR_PAYLOAD_TOO_LARGE", "Request body is too large.", 413);
    }
    let body: { tool?: string; args?: Record<string, unknown>; context?: Record<string, string>; confirmationToken?: string };
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return fail("OPERATOR_INVALID_JSON", "Invalid JSON request body.", 400);
    }

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

    const args = (body.args && typeof body.args === "object" && !Array.isArray(body.args)) ? body.args : {};
    const context = (body.context && typeof body.context === "object") ? body.context : {};

    // Two-phase confirmation: a confirmation_required tool must carry a valid,
    // single-use, server-issued token bound to this exact (tool, args) pair.
    // The bare `confirmed: true` boolean is gone — it was forgeable in one request.
    if (requiresConfirmation(tool.riskLevel) && !body.confirmationToken) {
      const confirmationToken = issueConfirmationToken(body.tool, args);
      return fail(
        "OPERATOR_CONFIRMATION_REQUIRED",
        `Tool "${body.tool}" requires confirmation. Resend with this confirmationToken.`,
        428,
        { confirmationToken, tool: body.tool },
      );
    }

    // Token verification is enforced centrally inside executeTool (single-use).
    const { result, record } = await executeToolDirect(body.tool, args, context, {
      confirmationToken: body.confirmationToken,
    });

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
