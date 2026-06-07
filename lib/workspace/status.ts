import { getB2BAgentState } from "@/lib/b2b-agent/store";
import { getGooglePlacesReadiness } from "@/lib/b2b-agent/googlePlacesProvider";
import { getContractStatus, loadAbi } from "@/lib/blockchain/blockchainService";
import { getLoyaltyState } from "@/lib/loyalty/store";
import { getMetaSetupStatus } from "@/lib/meta/configStore";
import { getOutreachReadiness } from "@/lib/outreach/service";
import { getStripeReadiness } from "@/lib/payments/stripeService";
import { getLocalPersistenceStatus } from "@/lib/storage/localJsonStore";
import { getWorkspaceState } from "./store";
import type { IntegrationReadiness } from "./types";

export function buildWorkspaceSnapshot(workspaceId?: string) {
  const state = getWorkspaceState();
  const workspace = workspaceId
    ? state.workspaces.find((item) => item.id === workspaceId)
    : state.workspaces[0];
  return {
    workspace,
    connectedAccounts: state.connectedAccounts.filter(
      (account) => !workspaceId || account.workspaceId === workspaceId,
    ),
    integrations: buildIntegrationReadiness(),
    recentAuditEvents: state.auditEvents
      .filter((event) => !workspaceId || event.workspaceId === workspaceId)
      .slice(0, 20),
  };
}

export function buildIntegrationReadiness(): IntegrationReadiness[] {
  const checkedAt = new Date().toISOString();
  const meta = getMetaSetupStatus();
  const persistence = getLocalPersistenceStatus();
  const loyalty = getLoyaltyState();
  const b2b = getB2BAgentState();
  const googlePlaces = getGooglePlacesReadiness();
  const stripe = getStripeReadiness();
  const outreach = getOutreachReadiness();
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
      status: googlePlaces.configured && googlePlaces.enabled
        ? "ready"
        : googlePlaces.configured
          ? "disabled"
          : "missing_config",
      mode: "real",
      configured: googlePlaces.configured,
      safeMode: true,
      requiredConfig: ["GOOGLE_PLACES_API_KEY", "AURA_ALLOW_REAL_DISCOVERY=true"],
      missingConfig: [
        ...(!googlePlaces.configured ? ["GOOGLE_PLACES_API_KEY"] : []),
        ...(!googlePlaces.enabled ? ["AURA_ALLOW_REAL_DISCOVERY=true"] : []),
      ],
      notes: [
        googlePlaces.enabled
          ? "Google Places Text Search adapter is enabled."
          : "Real discovery is disabled; mock discovery remains explicit.",
      ],
      checkedAt,
    },
    {
      key: "stripe_payments",
      label: "Stripe Payments",
      status: stripe.configured && stripe.paymentsEnabled
        ? "ready"
        : stripe.hasSecretKey || stripe.hasWebhookSecret
          ? "disabled"
          : "missing_config",
      mode: "real",
      configured: stripe.configured,
      safeMode: true,
      requiredConfig: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "AURA_ALLOW_REAL_PAYMENTS=true",
      ],
      missingConfig: [
        ...(!stripe.hasSecretKey ? ["STRIPE_SECRET_KEY"] : []),
        ...(!stripe.hasWebhookSecret ? ["STRIPE_WEBHOOK_SECRET"] : []),
        ...(!stripe.paymentsEnabled ? ["AURA_ALLOW_REAL_PAYMENTS=true"] : []),
      ],
      notes: [
        stripe.testMode
          ? "Stripe test-mode checkout and signed webhooks are available."
          : "Stripe live mode is rejected unless explicitly enabled.",
      ],
      checkedAt,
    },
    {
      key: "crm_outreach",
      label: "CRM / Outreach",
      status: outreach.enabled && outreach.hasApiKey && outreach.hasFromAddress
        ? "ready"
        : outreach.hasApiKey || outreach.hasFromAddress
          ? "disabled"
          : "mock_ready",
      mode: outreach.enabled ? "real" : "simulation",
      configured: outreach.hasApiKey && outreach.hasFromAddress,
      safeMode: true,
      requiredConfig: [
        "EMAIL_PROVIDER_API_KEY",
        "EMAIL_PROVIDER_FROM",
        "OUTREACH_SENDING_ENABLED=true",
      ],
      missingConfig: [
        ...(!outreach.hasApiKey ? ["EMAIL_PROVIDER_API_KEY"] : []),
        ...(!outreach.hasFromAddress ? ["EMAIL_PROVIDER_FROM"] : []),
        ...(!outreach.enabled ? ["OUTREACH_SENDING_ENABLED=true"] : []),
      ],
      notes: ["Outreach requires explicit approval. Delivery defaults to dry-run."],
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
      label: "Durable Persistence",
      status: persistence.enabled ? "ready" : "disabled",
      mode: persistence.enabled ? "local" : "simulation",
      configured: persistence.enabled,
      safeMode: true,
      requiredConfig: [],
      missingConfig: [],
      notes: [
        `Mode: ${persistence.mode}. Storage: ${
          "databasePath" in persistence ? persistence.databasePath : persistence.directory
        }.`,
      ],
      checkedAt,
    },
  ];
}
