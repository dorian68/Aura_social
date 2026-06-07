import { fail, ok } from "@/lib/apiResponse";
import { resetB2BAgentState } from "@/lib/b2b-agent/store";
import { resetLoyaltyState } from "@/lib/loyalty/store";
import { resetWorkspaceState } from "@/lib/workspace/store";
import { resetProviderOperationState } from "@/lib/payments/repository";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.AURA_TEST_MODE !== "true") {
    return fail("TEST_RESET_DISABLED", "Test fixture reset is disabled.", 404);
  }

  const loyalty = resetLoyaltyState();
  const b2b = resetB2BAgentState();
  const workspace = resetWorkspaceState();
  resetProviderOperationState();

  return ok({
    reset: true,
    loyalty: {
      programs: loyalty.programs.length,
      fans: loyalty.fans.length,
      transactions: loyalty.transactions.length,
    },
    b2b: {
      businesses: b2b.businesses.length,
      opportunities: b2b.opportunities.length,
      campaigns: b2b.campaigns.length,
    },
    workspace: {
      workspaces: workspace.workspaces.length,
      auditEvents: workspace.auditEvents.length,
    },
  });
}
