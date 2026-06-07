import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { runB2BExpansionAgent } from "@/lib/b2b-agent/orchestrator";
import { assertAllowedValues, GuardrailError, validateAmount, validateBoundedString } from "@/lib/agentGuardrails";
import type { BusinessCategory } from "@/lib/b2b-agent/types";

const B2B_CATEGORIES: readonly BusinessCategory[] = [
  "restaurant", "bar", "fashion", "beauty", "gym", "hotel",
  "tourism", "event_venue", "local_product", "concept_store", "culture",
];

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as {
      location?: string;
      categories?: BusinessCategory[];
      campaignBudget?: number;
    };

    const location = body.location == null
      ? "Fort-de-France"
      : validateBoundedString(body.location, "location", 120).trim() || "Fort-de-France";
    const categories = body.categories == null ? undefined : assertAllowedValues(body.categories, B2B_CATEGORIES, "categories");
    const campaignBudget = validateAmount(body.campaignBudget, "campaignBudget", { fallback: 200, min: 1, max: 1_000_000 });

    const result = await runB2BExpansionAgent({ location, categories, campaignBudget });

    return ok(result, {
      mockMode: result.discovery.source === "mock_google_places",
      discoverySource: result.discovery.source,
      externalCalls: result.discovery.externalCalls,
      externalMessagesSent: 0,
    });
  } catch (error) {
    if (error instanceof GuardrailError) return fail(error.code, error.message, 400);
    return handleApiError(error, "B2B_AGENT_RUN_FAILED");
  }
}
