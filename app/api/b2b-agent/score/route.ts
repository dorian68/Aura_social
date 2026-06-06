import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { discoverBusinesses, scoreDiscoveredBusinesses } from "@/lib/b2b-agent/orchestrator";
import { getB2BAgentState, setB2BAgentState } from "@/lib/b2b-agent/store";
import type { B2BDiscoveryInput } from "@/lib/b2b-agent/types";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as Partial<B2BDiscoveryInput>;
    const state = getB2BAgentState();
    const businesses = state.businesses.length
      ? state.businesses
      : discoverBusinesses(body);
    const scores = scoreDiscoveredBusinesses(businesses, body.location || "Fort-de-France");

    setB2BAgentState({
      ...state,
      businesses,
      fitScores: mergeByBusinessId(state.fitScores, scores),
    });

    return ok({ scores });
  } catch (error) {
    return handleApiError(error, "B2B_SCORING_FAILED");
  }
}

function mergeByBusinessId<T extends { businessId: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.businessId, item]));
  for (const item of incoming) map.set(item.businessId, item);
  return Array.from(map.values());
}
