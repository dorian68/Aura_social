const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3170";
const webBaseUrl = process.env.WEB_BASE_URL || baseUrl;

const results = [];
let previousMockMeta = null;

await run("GET /api/system/health", async () => {
  const response = await getJson("/api/system/health");
  previousMockMeta = response.data.meta.setup.mockMeta;
  assert(response.success, "health success");
  return {
    status: response.data.status,
    persistenceMode: response.data.environment.persistence.mode,
    mockMeta: previousMockMeta,
  };
});

await run("GET /", async () => {
  const response = await fetch(`${webBaseUrl}/`);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  return { status: response.status };
});

await run("GET /product/dashboard.html", async () => {
  const response = await fetch(`${webBaseUrl}/product/dashboard.html`);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  return { status: response.status };
});

await run("GET /api/workspace/state", async () => {
  const response = await getJson("/api/workspace/state");
  assert(response.success, "workspace state success");
  assert(response.data.integrations.length >= 8, "expected integration readiness entries");
  return {
    workspace: response.data.workspace.name,
    integrations: response.data.integrations.length,
    connectedAccounts: response.data.connectedAccounts.length,
  };
});

await run("POST /api/workspace/audit", async () => {
  const response = await postJson("/api/workspace/audit", {
    actorType: "developer",
    action: "smoke.workspace.audit",
    targetType: "workspace",
    message: "Smoke test audit event.",
    metadata: {
      externalCalls: 0,
      tokenPrinted: false,
    },
  });
  assert(response.success, "workspace audit success");
  return {
    action: response.data.action,
    metadata: response.data.metadata,
  };
});

await run("POST /api/meta/runtime-config mock=true", async () => {
  const response = await postJson("/api/meta/runtime-config", { mockMeta: true });
  assert(response.success, "runtime config success");
  return { mockMeta: response.data.mockMeta };
});

await run("GET /api/auth/meta/start mock", async () => {
  const response = await fetch(`${baseUrl}/api/auth/meta/start?mode=private`, { redirect: "manual" });
  assert(response.status === 200, `expected mock OAuth html 200, got ${response.status}`);
  const text = await response.text();
  assert(text.includes("META_AUTH_SUCCESS"), "mock OAuth payload missing");
  return { status: response.status, containsSuccessPayload: true };
});

await run("GET /api/private-insights mock", async () => {
  const response = await getJson("/api/private-insights?igUserId=mock-ig-1&accessToken=mock-token&authProvider=instagram");
  assert(response.success, "private insights success");
  assert(response.data.media.length === 10, "expected 10 mock media");
  return {
    media: response.data.media.length,
    totalReach: response.data.overview.total_reach,
    recommendations: response.data.recommendations.length,
  };
});

await run("POST /api/analyze-instagram mock", async () => {
  const response = await postJson("/api/analyze-instagram", { username: "nike" });
  assert(response.profile?.username === "@nike", "expected @nike profile");
  return {
    username: response.profile.username,
    followers: response.profile.followers,
    source: response.meta?.source,
  };
});

await run("POST /api/b2b-agent/run", async () => {
  const response = await postJson("/api/b2b-agent/run", { location: "Fort-de-France", campaignBudget: 200 });
  assert(response.success, "b2b run success");
  assert(response.meta.externalCalls === 0, "b2b must stay mock");
  return {
    businesses: response.data.businesses.length,
    externalCalls: response.meta.externalCalls,
    commission: response.data.campaignEconomics.platformCommission,
  };
});

await run("POST /api/agent/recommendations + execute_mock", async () => {
  const response = await postJson("/api/agent/recommendations", {});
  assert(response.success, "agent recommendations success");
  const first = response.data.recommendations[0];
  const action = await postJson("/api/agent/recommendations/action", {
    recommendationId: first.id,
    action: "execute_mock",
  });
  assert(action.success, "agent action success");
  assert(action.meta.externalActionsPerformed === 0, "agent action must be mock");
  return {
    recommendations: response.data.recommendations.length,
    actionStatus: action.data.recommendation.status,
    externalActionsPerformed: action.meta.externalActionsPerformed,
  };
});

await run("GET /api/blockchain/status", async () => {
  const response = await getJson("/api/blockchain/status");
  assert(response.success, "blockchain status success");
  return {
    mode: response.data.status.mode,
    auraLoyaltyPointsAbi: response.data.abiStatus.AuraLoyaltyPoints,
  };
});

await run("POST /api/meta/runtime-config restore mock", async () => {
  const response = await postJson("/api/meta/runtime-config", { mockMeta: Boolean(previousMockMeta) });
  assert(response.success, "runtime restore success");
  return { mockMeta: response.data.mockMeta };
});

const success = results.every((result) => result.status === "success");
console.log(JSON.stringify({ script: "smoke-platform", baseUrl, webBaseUrl, success, results }, null, 2));
if (!success) process.exitCode = 1;

async function run(label, fn) {
  try {
    const output = await fn();
    results.push({ label, status: "success", output });
  } catch (error) {
    results.push({ label, status: "fail", error: error instanceof Error ? error.message : String(error) });
  }
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return parseJsonResponse(response);
}

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonResponse(response);
}

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error?.code || ""} ${payload.error?.message || response.statusText}`.trim());
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
