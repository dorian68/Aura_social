import { handleApiError, ok, readJsonBody, fail } from "@/lib/apiResponse";
import { handleOperatorChat } from "@/lib/operator/operatorOrchestrator";
import type { OperatorChatRequest } from "@/lib/operator/types";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request) as Partial<OperatorChatRequest>;

    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return fail("OPERATOR_MISSING_MESSAGE", "message is required and must be a non-empty string.", 400);
    }

    const chatRequest: OperatorChatRequest = {
      message: body.message.trim(),
      context: body.context || {},
      history: body.history || [],
    };

    const response = await handleOperatorChat(chatRequest);

    return ok(response, {
      operatorMode: process.env.OPERATOR_MODE || "rules",
      llmEnabled: process.env.OPERATOR_ENABLE_LLM === "true",
    });
  } catch (err) {
    return handleApiError(err, "OPERATOR_CHAT_ERROR");
  }
}
