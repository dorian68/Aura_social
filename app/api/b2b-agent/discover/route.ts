import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { discoverBusinessesWithProvider } from "@/lib/b2b-agent/orchestrator";
import { getB2BAgentState, setB2BAgentState } from "@/lib/b2b-agent/store";
import type { B2BDiscoveryInput } from "@/lib/b2b-agent/types";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request).catch(() => ({}))) as Partial<B2BDiscoveryInput>;
    const discovery = await discoverBusinessesWithProvider(body);
    const businesses = discovery.businesses;
    const state = getB2BAgentState();
    setB2BAgentState({
      ...state,
      businesses: mergeById(state.businesses, businesses),
    });

    return ok(
      { businesses },
      { source: discovery.source, externalCalls: discovery.externalCalls },
    );
  } catch (error) {
    return handleApiError(error, "B2B_DISCOVERY_FAILED");
  }
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
