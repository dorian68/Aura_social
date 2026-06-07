import fs from "node:fs";

const requiredDocs = [
  "PRODUCT_PHILOSOPHY.md",
  "FUNCTIONAL_SPECIFICATION.md",
  "CLI_TESTABILITY_CONTRACT.md",
  "PRODUCTION_READINESS.md",
  "backend_first_debugging_paradigm.md",
];

const requiredScripts = [
  "typecheck",
  "lint",
  "build",
  "smoke:platform",
  "smoke:security",
  "smoke:journey",
  "smoke:negative",
  "smoke:persistence",
  "smoke:authz",
  "smoke:integrations",
  "smoke:browser",
  "smoke:business",
  "audit:commercial",
  "production:check",
  "contracts:test",
];

const checks = [];

check("required docs exist", requiredDocs.every((file) => fs.existsSync(file)), {
  missing: requiredDocs.filter((file) => !fs.existsSync(file)),
});

const packageJson = readPackageJson();
check("package.json readable", Boolean(packageJson), {});
if (packageJson) {
  const scripts = packageJson.scripts || {};
  check("required npm scripts exist", requiredScripts.every((name) => scripts[name]), {
    missing: requiredScripts.filter((name) => !scripts[name]),
  });
}

const nodeEnv = process.env.NODE_ENV || "development";
const demoMode = process.env.DEMO_MODE === "true";
const apiToken = process.env.AURA_API_TOKEN || "";
const apiPrincipals = readApiPrincipals();
const frontendUrl = process.env.FRONTEND_URL || "";
const persistence = process.env.AURA_PERSISTENCE || "sqlite";
const mockMeta = process.env.MOCK_META === "true" || !process.env.MOCK_META;
const allowDiscovery = process.env.AURA_ALLOW_REAL_DISCOVERY === "true";
const allowPayments = process.env.AURA_ALLOW_REAL_PAYMENTS === "true";
const allowOutreach = process.env.OUTREACH_SENDING_ENABLED === "true";
const allowOnchainWrites = process.env.AURA_ALLOW_ONCHAIN_WRITES === "true";

check("production NODE_ENV is set", nodeEnv === "production", { nodeEnv });
check("DEMO_MODE is disabled", !demoMode, { demoMode });
check("production authentication identities are configured", apiToken.length >= 24 || apiPrincipals.valid, {
  legacyTokenConfigured: Boolean(apiToken),
  legacyTokenLength: apiToken.length,
  apiPrincipalCount: apiPrincipals.count,
  invalidPrincipalCount: apiPrincipals.invalidCount,
});
check("FRONTEND_URL is configured", Boolean(frontendUrl), { frontendUrl: redactUrl(frontendUrl) });
check("production FRONTEND_URL is not localhost", Boolean(frontendUrl) && !/localhost|127\.0\.0\.1/i.test(frontendUrl), {
  frontendUrl: redactUrl(frontendUrl),
});
check("durable SQLite database configured", persistence === "sqlite" && Boolean(process.env.AURA_DATABASE_PATH || process.env.DATABASE_URL), {
  databasePathConfigured: Boolean(process.env.AURA_DATABASE_PATH || process.env.DATABASE_URL),
  persistence,
});
check("Meta real mode configured for paid production", !mockMeta && Boolean(process.env.APP_ID) && Boolean(process.env.APP_SECRET), {
  mockMeta,
  hasAppId: Boolean(process.env.APP_ID),
  hasAppSecret: Boolean(process.env.APP_SECRET),
});
check("Google Places real discovery configured", allowDiscovery && Boolean(process.env.GOOGLE_PLACES_API_KEY), {
  allowDiscovery,
  hasGooglePlacesApiKey: Boolean(process.env.GOOGLE_PLACES_API_KEY),
});
check("real payments are provider-backed or explicitly blocked", allowPayments && Boolean(process.env.STRIPE_SECRET_KEY) && Boolean(process.env.STRIPE_WEBHOOK_SECRET), {
  allowPayments,
  hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
  hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
});
check("real outreach is provider-backed or explicitly blocked", allowOutreach && Boolean(process.env.EMAIL_PROVIDER_API_KEY) && Boolean(process.env.EMAIL_PROVIDER_FROM), {
  allowOutreach,
  hasOutreachProvider: Boolean(process.env.EMAIL_PROVIDER_API_KEY),
  hasOutreachFromAddress: Boolean(process.env.EMAIL_PROVIDER_FROM),
});
check("on-chain writes are configured before enabling", !allowOnchainWrites || allOnchainConfigPresent(), {
  allowOnchainWrites,
  hasRpc: Boolean(process.env.HARDHAT_RPC_URL || process.env.AURA_RPC_URL),
  hasPointsAddress: Boolean(process.env.AURA_POINTS_CONTRACT_ADDRESS),
  hasFanPassAddress: Boolean(process.env.AURA_FAN_PASS_CONTRACT_ADDRESS),
  hasRegistryAddress: Boolean(process.env.AURA_REWARD_REGISTRY_CONTRACT_ADDRESS),
});
check("mock and simulation blockers are documented", docsMentionProductionBlockers(), {});

const failed = checks.filter((item) => !item.pass);
const result = {
  script: "production-check",
  success: failed.length === 0,
  verdict: failed.length === 0 ? "YES" : "NO",
  checks,
  blockers: failed.map((item) => ({
    area: item.label,
    detail: item.detail,
  })),
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exitCode = 1;

function check(label, pass, detail = {}) {
  checks.push({ label, pass, detail });
}

function readPackageJson() {
  try {
    return JSON.parse(fs.readFileSync("package.json", "utf8"));
  } catch {
    return null;
  }
}

function allOnchainConfigPresent() {
  return Boolean(
    (process.env.HARDHAT_RPC_URL || process.env.AURA_RPC_URL) &&
      process.env.AURA_POINTS_CONTRACT_ADDRESS &&
      process.env.AURA_FAN_PASS_CONTRACT_ADDRESS &&
      process.env.AURA_REWARD_REGISTRY_CONTRACT_ADDRESS,
  );
}

function docsMentionProductionBlockers() {
  try {
    const readiness = fs.readFileSync("PRODUCTION_READINESS.md", "utf8");
    return (
      /P0 Blockers/i.test(readiness) &&
      /NO for paid production launch/i.test(readiness) &&
      /Payments\s*\|\s*PARTIAL/i.test(readiness)
    );
  } catch {
    return false;
  }
}

function redactUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.replace(/\/\/.*@/, "//***@");
  }
}

function readApiPrincipals() {
  if (!process.env.AURA_API_KEYS_JSON) {
    return { valid: false, count: 0, invalidCount: 0 };
  }
  try {
    const entries = JSON.parse(process.env.AURA_API_KEYS_JSON);
    if (!Array.isArray(entries)) return { valid: false, count: 0, invalidCount: 1 };
    const validEntries = entries.filter(
      (entry) =>
        entry &&
        typeof entry.token === "string" &&
        entry.token.length >= 24 &&
        ["viewer", "creator", "operator", "admin"].includes(entry.role) &&
        Array.isArray(entry.workspaceIds) &&
        entry.workspaceIds.length > 0,
    );
    return {
      valid: validEntries.length > 0 && validEntries.length === entries.length,
      count: validEntries.length,
      invalidCount: entries.length - validEntries.length,
    };
  } catch {
    return { valid: false, count: 0, invalidCount: 1 };
  }
}
