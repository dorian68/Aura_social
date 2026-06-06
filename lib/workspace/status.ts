import { getB2BAgentState } from "@/lib/b2b-agent/store";
import { getContractStatus, loadAbi } from "@/lib/blockchain/blockchainService";
import { getLoyaltyState } from "@/lib/loyalty/store";
import { getMetaSetupStatus } from "@/lib/meta/configStore";
import { getLocalPersistenceStatus } from "@/lib/storage/localJsonStore";
import { getWorkspaceState } from "./store";
import type { IntegrationReadiness } from "./types";

export function buildWorkspaceSnapshot() {
  const state = getWorkspaceState();
  return {
    workspace: state.workspaces[0],
    connectedAccounts: state.connectedAccounts,
    integrations: buildIntegrationReadiness(),
    recentAuditEvents: state.auditEvents.slice(0, 20),
  };
}

export function buildIntegrationReadiness(): IntegrationReadiness[] {
  const checkedAt = new Date().toISOString();
  const meta = getMetaSetupStatus();
  const persistence = getLocalPersistenceStatus();
  const loyalty = getLoyaltyState();
  const b2b = getB2BAgentState();
  const blockchain = getContractStatus();
  const abiCounts = {
    AuraLoyaltyPoints: loadAbi("AuraLoyaltyPoints").length,
    AuraFanPass: loadAbi("AuraFanPass").length,
    AuraRewardRegistry: loadAbi("AuraRewardRegistry").length,
  };

  return [
    {
      key: "meta_login",
      label: "Meta Login",
      status: meta.mockMeta ? "mock_ready" : meta.facebookLoginConfigured ? "ready" : "missing_config",
      mode: meta.mockMeta ? "mock" : "real",
      configured: meta.facebookLoginConfigured,
      safeMode: false,
      requiredConfig: meta.authMode === "facebook" ? ["APP_ID", "APP_SECRET", "FACEBOOK_LOGIN_CONFIG_ID", "FRONTEND_URL"] : ["APP_ID", "APP_SECRET", "FRONTEND_URL"],
      missingConfig: meta.facebookLoginConfigured ? [] : ["APP_ID", "APP_SECRET"].filter((key) => (key === "APP_ID" ? !meta.hasAppId : !meta.hasAppSecret)),
      notes: [
        `Auth mode: ${meta.authMode}`,
        meta.mockMeta ? "Mock mode is active." : "Real OAuth requires a Meta app and authorized redirect URI.",
      ],
      checkedAt,
    },
    {
      key: "instagram_public_discovery",
      label: "Instagram Public Discovery",
      status: meta.mockMeta ? "mock_ready" : meta.publicDiscoveryConfigured ? "ready" : "missing_config",
      mode: meta.mockMeta ? "mock" : "real",
      configured: meta.publicDiscoveryConfigured,
      safeMode: false,
      requiredConfig: ["Discovery source IG user ID", "Discovery source access token"],
      missingConfig: meta.publicDiscoveryConfigured ? [] : ["Discovery source IG user ID", "Discovery source access token"],
      notes: [
        meta.discoverySourceUsername ? `Discovery source: @${meta.discoverySourceUsername.replace(/^@/, "")}` : "No Business Discovery source connected yet.",
        "Uses official Instagram Graph API only.",
      ],
      checkedAt,
    },
    {
      key: "instagram_private_insights",
      label: "Instagram Private Insights",
      status: meta.mockMeta ? "mock_ready" : meta.facebookLoginConfigured ? "ready" : "missing_config",
      mode: meta.mockMeta ? "mock" : "real",
      configured: meta.facebookLoginConfigured,
      safeMode: false,
      requiredConfig: ["Meta Login permissions", "Business/Creator Instagram account"],
      missingConfig: meta.facebookLoginConfigured ? [] : ["Meta app credentials"],
      notes: ["Tokens are held in memory for this prototype session and are not persisted to disk."],
      checkedAt,
    },
    {
      key: "loyalty_engine",
      label: "Loyalty Engine",
      status: loyalty.programs.length ? "ready" : "error",
      mode: "local",
      configured: loyalty.programs.length > 0,
      safeMode: true,
      requiredConfig: [],
      missingConfig: [],
      notes: [`${loyalty.fans.length} fans, ${loyalty.transactions.length} ledger transaction(s).`],
      checkedAt,
    },
    {
      key: "b2b_agent",
      label: "B2B Expansion Agent",
      status: "mock_ready",
      mode: "simulation",
      configured: true,
      safeMode: true,
      requiredConfig: [],
      missingConfig: [],
      notes: [`${b2b.businesses.length} discovered mock businesses, ${b2b.opportunities.length} opportunities.`],
      checkedAt,
    },
    {
      key: "google_places",
      label: "Google Places",
      status: process.env.GOOGLE_PLACES_API_KEY ? "disabled" : "missing_config",
      mode: "future",
      configured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      safeMode: true,
      requiredConfig: ["GOOGLE_PLACES_API_KEY", "real provider adapter"],
      missingConfig: process.env.GOOGLE_PLACES_API_KEY ? ["real provider adapter"] : ["GOOGLE_PLACES_API_KEY", "real provider adapter"],
      notes: ["No real Google Places call is made in this MVP."],
      checkedAt,
    },
    {
      key: "stripe_payments",
      label: "Stripe Payments",
      status: process.env.STRIPE_SECRET_KEY ? "disabled" : "missing_config",
      mode: "future",
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      safeMode: true,
      requiredConfig: ["STRIPE_SECRET_KEY", "webhook signing secret", "test-mode checkout adapter"],
      missingConfig: process.env.STRIPE_SECRET_KEY ? ["webhook signing secret", "test-mode checkout adapter"] : ["STRIPE_SECRET_KEY", "webhook signing secret", "test-mode checkout adapter"],
      notes: ["Current PME payments are simulated only."],
      checkedAt,
    },
    {
      key: "crm_outreach",
      label: "CRM / Outreach",
      status: process.env.OUTREACH_SENDING_ENABLED === "true" ? "disabled" : "mock_ready",
      mode: "simulation",
      configured: process.env.OUTREACH_SENDING_ENABLED === "true",
      safeMode: true,
      requiredConfig: ["CRM_API_KEY or EMAIL_PROVIDER_API_KEY", "approval workflow", "sending adapter"],
      missingConfig: process.env.OUTREACH_SENDING_ENABLED === "true" ? ["sending adapter"] : [],
      notes: ["Outreach drafts require approval. Real sending remains disabled."],
      checkedAt,
    },
    {
      key: "blockchain_contracts",
      label: "Blockchain Contracts",
      status: abiCounts.AuraLoyaltyPoints && abiCounts.AuraFanPass && abiCounts.AuraRewardRegistry ? "ready" : "error",
      mode: "local",
      configured: true,
      safeMode: true,
      requiredConfig: [],
      missingConfig: [],
      notes: [
        blockchain.message,
        `ABI counts: points ${abiCounts.AuraLoyaltyPoints}, passes ${abiCounts.AuraFanPass}, rewards ${abiCounts.AuraRewardRegistry}.`,
      ],
      checkedAt,
    },
    {
      key: "local_persistence",
      label: "Local Persistence",
      status: persistence.enabled ? "ready" : "disabled",
      mode: persistence.enabled ? "local" : "simulation",
      configured: persistence.enabled,
      safeMode: true,
      requiredConfig: [],
      missingConfig: [],
      notes: [`Mode: ${persistence.mode}. State directory: ${persistence.directory}.`],
      checkedAt,
    },
  ];
}
