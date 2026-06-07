import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || "3000"}`;
const webBaseUrl = process.env.WEB_BASE_URL || baseUrl;
const apiToken = process.env.AURA_API_TOKEN || "";
const minScore = Number(process.env.BUSINESS_SMOKE_MIN_SCORE || "75");
const writeReport = process.argv.includes("--audit") || process.argv.includes("--report");

const evidence = [];
const blockers = [];

const productDocs = readDocs();
const serverEvidence = await collectServerEvidence();
const scores = scoreExperience(productDocs, serverEvidence);
const overall = Math.round(
  (scores.first30SecondClarity +
    scores.businessValue +
    scores.trust +
    scores.uxSimplicity +
    scores.featureDepth +
    scores.promiseAlignment +
    scores.commercialReadiness +
    scores.retentionPotential) /
    8,
);
const wouldPay = scores.commercialReadiness >= 75 && scores.trust >= 80 && !blockers.some((item) => item.priority === "P0");
const verdict = wouldPay && overall >= minScore ? "PASS" : overall >= 60 ? "PARTIAL" : "FAIL";

const report = {
  script: "business-smoke",
  baseUrl,
  minScore,
  success: verdict === "PASS",
  verdict,
  wouldPay,
  overall,
  scores,
  blockers,
  evidence,
};

if (writeReport) {
  const reportPath = writeBusinessReport(report);
  report.reportPath = reportPath;
}

console.log(JSON.stringify(report, null, 2));

if (verdict !== "PASS") process.exitCode = 1;

function readDocs() {
  const required = [
    "PRODUCT_PHILOSOPHY.md",
    "FUNCTIONAL_SPECIFICATION.md",
    "CLI_TESTABILITY_CONTRACT.md",
    "PRODUCTION_READINESS.md",
  ];
  const docs = {};
  for (const file of required) {
    if (!fs.existsSync(file)) {
      blockers.push({ priority: "P0", area: "documentation", message: `${file} is missing.` });
      docs[file] = "";
      continue;
    }
    docs[file] = fs.readFileSync(file, "utf8");
  }
  const philosophy = docs["PRODUCT_PHILOSOPHY.md"];
  if (!/Product promise/i.test(philosophy)) {
    blockers.push({ priority: "P0", area: "promise", message: "Product promise is not explicit." });
  }
  if (!/What must never be faked/i.test(philosophy)) {
    blockers.push({ priority: "P1", area: "trust", message: "Trust boundaries are not explicit." });
  }
  return docs;
}

async function collectServerEvidence() {
  const output = {
    reachable: false,
    pages: {},
    health: null,
    workspace: null,
    b2b: null,
    agent: null,
  };

  try {
    const root = await fetchReadWithRetry(`${baseUrl}/`);
    const webRoot = await fetchReadWithRetry(`${webBaseUrl}/`);
    output.pages.apiRoot = root.status;
    output.pages.root = webRoot.status;
    const dashboard = await fetchReadWithRetry(`${webBaseUrl}/product/dashboard.html`);
    output.pages.dashboard = dashboard.status;
    output.reachable = webRoot.ok || dashboard.ok;
    evidence.push({ area: "ux", signal: "root_and_dashboard_routes", value: output.pages });
  } catch (error) {
    blockers.push({ priority: "P0", area: "server", message: `Application server is not reachable at ${baseUrl}.` });
    evidence.push({ area: "server", signal: "unreachable", value: error instanceof Error ? error.message : String(error) });
    return output;
  }

  try {
    output.health = await getJson("/api/system/health", { publicRoute: true });
    evidence.push({
      area: "trust",
      signal: "health_exposes_modes",
      value: {
        mockMeta: output.health.data.meta.setup.mockMeta,
        persistence: output.health.data.environment.persistence.mode,
        b2bExternalCallsEnabled: output.health.data.b2b.externalCallsEnabled,
      },
    });
  } catch (error) {
    blockers.push({ priority: "P0", area: "health", message: `Health endpoint failed: ${messageOf(error)}` });
  }

  try {
    output.workspace = await getJson("/api/workspace/state");
    evidence.push({
      area: "readiness",
      signal: "integration_readiness_entries",
      value: output.workspace.data.integrations.map((item) => ({
        key: item.key,
        status: item.status,
        mode: item.mode,
        safeMode: item.safeMode,
      })),
    });
  } catch (error) {
    blockers.push({ priority: "P0", area: "workspace", message: `Workspace state failed: ${messageOf(error)}` });
  }

  try {
    output.b2b = await postJson("/api/b2b-agent/run", {
      location: "Fort-de-France",
      campaignBudget: 200,
    });
    evidence.push({
      area: "value",
      signal: "b2b_campaign_economics",
      value: {
        businesses: output.b2b.data.businesses.length,
        platformCommission: output.b2b.data.bestOpportunity.platformCommission,
        fanRewardBudget: output.b2b.data.bestOpportunity.fanRewardBudget,
        externalCalls: output.b2b.meta.externalCalls,
        paymentStatus: output.b2b.data.campaignEconomics.paymentStatus,
      },
    });
  } catch (error) {
    blockers.push({ priority: "P0", area: "b2b", message: `B2B monetization journey failed: ${messageOf(error)}` });
  }

  try {
    output.agent = await postJson("/api/agent/recommendations", {});
    evidence.push({
      area: "activation",
      signal: "agent_recommendations",
      value: {
        recommendations: output.agent.data.recommendations.length,
        drafts: output.agent.data.drafts.length,
        execution: output.agent.meta.execution,
      },
    });
  } catch (error) {
    blockers.push({ priority: "P1", area: "agent", message: `Agent recommendation journey failed: ${messageOf(error)}` });
  }

  return output;
}

function scoreExperience(docs, server) {
  let first30SecondClarity = 65;
  let businessValue = 60;
  let trust = 60;
  let uxSimplicity = 60;
  let featureDepth = 65;
  let promiseAlignment = 60;
  let commercialReadiness = 45;
  let retentionPotential = 55;

  if (/Instagram audience -> fan insight -> loyalty state -> rewards\/fan passes -> partner campaigns -> measurable revenue/i.test(docs["PRODUCT_PHILOSOPHY.md"])) {
    first30SecondClarity += 10;
    promiseAlignment += 12;
  }
  if (/What must never be faked/i.test(docs["PRODUCT_PHILOSOPHY.md"])) trust += 8;
  if (/Acceptance Criteria/i.test(docs["FUNCTIONAL_SPECIFICATION.md"])) featureDepth += 8;
  if (/Mock\/Demo Mode Rules/i.test(docs["FUNCTIONAL_SPECIFICATION.md"])) trust += 6;

  if (server.pages.root === 200) first30SecondClarity += 4;
  if (server.pages.dashboard === 200) uxSimplicity += 5;
  if (server.health?.data?.loyalty?.fans > 0) {
    businessValue += 5;
    retentionPotential += 8;
  }
  if (server.workspace?.data?.integrations?.length >= 8) {
    featureDepth += 8;
    trust += 4;
  }
  if (server.b2b?.data?.bestOpportunity?.platformCommission > 0) {
    businessValue += 10;
    commercialReadiness += 8;
    promiseAlignment += 7;
  }
  if (server.b2b?.meta?.externalCalls === 0 && server.b2b?.data?.campaignEconomics?.paymentStatus === "simulated_paid") {
    const stripe = integrationByKey(server, "stripe_payments");
    trust += 6;
    commercialReadiness -= 5;
    blockers.push({
      priority: "P0",
      area: "payments",
      message: stripe?.mode === "real"
        ? `The tested B2B journey is still simulated; the Stripe adapter is ${stripe.status} and has not completed a real test-account Checkout.`
        : "The B2B paid campaign outcome is still simulated; a paying customer would not trust it as a real transaction.",
    });
  }
  if (server.health?.data?.b2b?.externalCallsEnabled === false) {
    const googlePlaces = integrationByKey(server, "google_places");
    const outreach = integrationByKey(server, "crm_outreach");
    blockers.push({
      priority: "P0",
      area: "b2b_real_world",
      message:
        `Real-world B2B is not active in the tested profile: Google Places is ${googlePlaces?.status || "unavailable"} and outreach is ${outreach?.status || "unavailable"}.`,
    });
  }
  if (server.agent?.data?.recommendations?.length > 0) {
    featureDepth += 7;
    retentionPotential += 5;
  }
  if (/No for paid production launch/i.test(docs["PRODUCTION_READINESS.md"])) {
    commercialReadiness -= 10;
    trust += 4;
  }

  return {
    first30SecondClarity: clamp(first30SecondClarity),
    businessValue: clamp(businessValue),
    trust: clamp(trust),
    uxSimplicity: clamp(uxSimplicity),
    featureDepth: clamp(featureDepth),
    promiseAlignment: clamp(promiseAlignment),
    commercialReadiness: clamp(commercialReadiness),
    retentionPotential: clamp(retentionPotential),
  };
}

function writeBusinessReport(report) {
  fs.mkdirSync("reports", { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const target = path.join("reports", `${date}_business-client_main-journey.md`);
  const body = `# Business Client Mystere Report

## Context
Product: Aura
Target user: Instagram creator/operator monetizing a creator audience.
Journey tested: Main monetization loop from dashboard readiness to B2B simulated campaign.
Product promise: Turn creator audience into an observable monetization loop.

## First 30 Seconds
What I understood: Aura links Instagram analytics, loyalty, fan passes, recommendations and partner campaigns.
What confused me: The difference between real connected value and simulation still requires careful reading.
What action seemed obvious: Open the dashboard, inspect readiness, then run the monetization/B2B flow.

## Journey
Steps tested: health, root, dashboard, workspace readiness, B2B campaign economics, agent recommendations.
Expected value: Concrete monetization proof with trusted status labels.
Actual value: Useful demo value; real commercial activation remains blocked by simulated payment/outreach/provider flows.

## UX Review
Clarity: ${report.scores.first30SecondClarity}/100
Trust: ${report.scores.trust}/100
Friction: ${report.scores.uxSimplicity}/100
Coherence: ${report.scores.promiseAlignment}/100
Empty/error states: Partially covered by docs and API readiness, not fully browser-tested here.

## Commercial Review
Would I pay? ${report.wouldPay ? "Yes" : "No"}
At what price? Beta/free pilot until real payment, outreach and attribution workflows exist.
Why? The loop is compelling, but the paid campaign outcome is not real yet.
What blocks purchase? ${report.blockers.map((item) => `${item.priority} ${item.area}: ${item.message}`).join(" ")}
What would make this compelling? Real Instagram validation, real partner discovery, Stripe test/live payment activation, campaign attribution and clear ROI reports.

## Scores
First 30-second clarity: ${report.scores.first30SecondClarity}/100
Business value: ${report.scores.businessValue}/100
Trust: ${report.scores.trust}/100
UX simplicity: ${report.scores.uxSimplicity}/100
Feature depth: ${report.scores.featureDepth}/100
Promise alignment: ${report.scores.promiseAlignment}/100
Commercial readiness: ${report.scores.commercialReadiness}/100
Retention potential: ${report.scores.retentionPotential}/100
Overall: ${report.overall}/100

## Verdict
${report.verdict}

## Top Corrections
P0: Replace simulated B2B payment/outreach/provider flows with tested real integrations or label the product as demo-only.
P1: Add browser-level UX smoke checks for activation clarity and mock labels.
P2: Add pricing hypothesis after real campaign activation exists.
`;
  fs.writeFileSync(target, body, "utf8");
  return target;
}

async function getJson(pathname, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${pathname}`, {
        headers: options.publicRoute ? undefined : authHeaders(),
      });
      return await parseJsonResponse(response, pathname);
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isRetryableReadError(error)) break;
      await delay(350 * attempt);
    }
  }
  throw lastError;
}

async function postJson(pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return parseJsonResponse(response, pathname);
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  return headers;
}

async function fetchReadWithRetry(url) {
  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(url);
    if (![404, 500, 502, 503, 504].includes(response.status) || attempt === 3) return response;
    await delay(350 * attempt);
  }
  return response;
}

async function parseJsonResponse(response, pathname) {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && !apiToken) {
    throw new Error(`${pathname} returned 401. Set AURA_API_TOKEN in the smoke script environment to match the server token.`);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error?.code || ""} ${payload.error?.message || response.statusText}`.trim());
  }
  return payload;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function integrationByKey(server, key) {
  return server.workspace?.data?.integrations?.find((item) => item.key === key);
}

function isRetryableReadError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /^(404|500|502|503|504)\b/.test(message) || /fetch failed|ECONNRESET|ECONNREFUSED/i.test(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
