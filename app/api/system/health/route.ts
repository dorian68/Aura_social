import { ok } from "@/lib/apiResponse";
import {
  calculateB2BPlatformRevenue,
  calculateProviderBackedPlatformRevenue,
  getB2BAgentState,
} from "@/lib/b2b-agent/store";
import { getGooglePlacesReadiness } from "@/lib/b2b-agent/googlePlacesProvider";
import { getContractStatus, loadAbi } from "@/lib/blockchain/blockchainService";
import { getMetaSetupStatus } from "@/lib/meta/configStore";
import { getMetaLogFilePath } from "@/lib/meta/logger";
import { getLoyaltyState } from "@/lib/loyalty/store";
import { getLocalPersistenceStatus } from "@/lib/storage/localJsonStore";
import { buildIntegrationReadiness } from "@/lib/workspace/status";
import { getWorkspaceState } from "@/lib/workspace/store";
import { getOutreachReadiness } from "@/lib/outreach/service";
import { getStripeReadiness } from "@/lib/payments/stripeService";

export const runtime = "nodejs";

export async function GET() {
  const loyalty = getLoyaltyState();
  const b2b = getB2BAgentState();
  const b2bPlatformRevenue = calculateB2BPlatformRevenue(b2b.campaigns);
  const providerBackedRevenue = calculateProviderBackedPlatformRevenue(b2b.campaigns);
  const workspace = getWorkspaceState();
  const integrations = buildIntegrationReadiness();

  return ok({
    status: "ok",
    checkedAt: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      persistence: getLocalPersistenceStatus(),
    },
    workspace: {
      workspaces: workspace.workspaces.length,
      connectedAccounts: workspace.connectedAccounts.length,
      auditEvents: workspace.auditEvents.length,
      integrations: integrations.map((integration) => ({
        key: integration.key,
        status: integration.status,
        configured: integration.configured,
        safeMode: integration.safeMode,
      })),
    },
    meta: {
      setup: getMetaSetupStatus(),
      logFile: getMetaLogFilePath(),
    },
    loyalty: {
      creators: loyalty.creators.length,
      programs: loyalty.programs.length,
      fans: loyalty.fans.length,
      transactions: loyalty.transactions.length,
      rewards: loyalty.rewards.length,
      fanPasses: loyalty.fanPasses.length,
      recommendations: loyalty.recommendations.length,
      campaigns: loyalty.campaigns.length,
    },
    b2b: {
      businesses: b2b.businesses.length,
      opportunities: b2b.opportunities.length,
      campaigns: b2b.campaigns.length,
      runs: b2b.runs.length,
      platformRevenue: b2bPlatformRevenue,
      platformRevenueSource: "campaign_commissions",
      providerBackedRevenue,
      providerBackedRevenueSource: "stripe_paid_campaign_commissions",
      externalCallsEnabled:
        getGooglePlacesReadiness().configured && getGooglePlacesReadiness().enabled,
      outreachSendingEnabled: getOutreachReadiness().enabled,
      stripe: getStripeReadiness(),
    },
    blockchain: {
      status: getContractStatus(),
      abiStatus: {
        AuraLoyaltyPoints: loadAbi("AuraLoyaltyPoints").length,
        AuraFanPass: loadAbi("AuraFanPass").length,
        AuraRewardRegistry: loadAbi("AuraRewardRegistry").length,
      },
    },
  });
}
