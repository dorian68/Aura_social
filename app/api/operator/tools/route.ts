import { handleApiError, ok } from "@/lib/apiResponse";
import { getRegisteredTools } from "@/lib/operator/operatorOrchestrator";

export async function GET() {
  try {
    const tools = getRegisteredTools();

    const byCategory = tools.reduce<Record<string, typeof tools>>(
      (acc, tool) => {
        if (!acc[tool.category]) acc[tool.category] = [];
        acc[tool.category].push(tool);
        return acc;
      },
      {},
    );

    return ok(
      { tools, byCategory },
      {
        count: tools.length,
        categories: Object.keys(byCategory),
      },
    );
  } catch (err) {
    return handleApiError(err, "OPERATOR_TOOLS_ERROR");
  }
}
