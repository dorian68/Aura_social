const baseUrl = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || "3000"}`;
const apiToken = process.env.AURA_API_TOKEN || "";

const results = [];
const context = {};

await run("GET /api/system/health", async () => {
  const response = await getJson("/api/system/health", { publicRoute: true });
  assert(response.success, "health success");
  assert(response.data.status === "ok", "health status ok");
  assert(!containsKnownSecret(response), "health response must not expose known secrets");
  context.initialHealth = response.data;
  return {
    status: response.data.status,
    persistence: response.data.environment.persistence.mode,
    mockMeta: response.data.meta.setup.mockMeta,
    integrations: response.data.workspace.integrations.length,
  };
});

await run("GET /api/workspace/state", async () => {
  const response = await getJson("/api/workspace/state");
  assert(response.success, "workspace state success");
  assert(response.data.integrations.length >= 8, "expected integration readiness entries");
  assert(response.data.integrations.some((item) => item.key === "loyalty_engine"), "loyalty integration missing");
  assert(response.data.integrations.some((item) => item.key === "b2b_agent"), "b2b integration missing");
  return {
    workspace: response.data.workspace.name,
    integrations: response.data.integrations.length,
    connectedAccounts: response.data.connectedAccounts.length,
  };
});

await run("GET /api/loyalty/demo", async () => {
  const response = await getJson("/api/loyalty/demo");
  assert(response.success, "loyalty demo success");
  const program = response.data.state.programs[0];
  const fan = response.data.state.fans.find((item) => item.programId === program.id);
  assert(program, "demo program missing");
  assert(fan, "demo fan missing");
  context.programId = program.id;
  context.fanId = fan.id;
  context.initialFanBalance = fan.pointsBalance;
  context.rewardId = response.data.state.rewards.find((item) => item.programId === program.id)?.id;
  return {
    programId: context.programId,
    fanId: context.fanId,
    fanBalance: context.initialFanBalance,
    rewards: response.data.state.rewards.length,
  };
});

await run("POST /api/loyalty/award", async () => {
  const referenceId = `smoke_journey_award_${Date.now()}`;
  const response = await postJson("/api/loyalty/award", {
    programId: context.programId,
    fanId: context.fanId,
    actionType: "manual_bonus",
    pointsOverride: 17,
    source: "manual",
    referenceId,
    metadata: { smoke: true, journey: "main" },
  });
  assert(response.success, "loyalty award success");
  assert(response.data.transaction.pointsDelta === 17, "expected +17 points transaction");
  assert(
    response.data.fan.pointsBalance === context.initialFanBalance + 17,
    "fan balance should increase by awarded points",
  );
  context.afterAwardBalance = response.data.fan.pointsBalance;
  return {
    fanBalance: response.data.fan.pointsBalance,
    transaction: response.data.transaction.id,
    referenceId,
  };
});

await run("POST /api/loyalty/redeem", async () => {
  const referenceId = `smoke_journey_redeem_${Date.now()}`;
  const response = await postJson("/api/loyalty/redeem", {
    programId: context.programId,
    fanId: context.fanId,
    points: 7,
    referenceId,
    metadata: { smoke: true, journey: "main" },
  });
  assert(response.success, "loyalty redeem success");
  assert(response.data.transaction.pointsDelta === -7, "expected -7 points transaction");
  assert(response.data.fan.pointsBalance === context.afterAwardBalance - 7, "fan balance should decrease");
  context.afterRedeemBalance = response.data.fan.pointsBalance;
  return {
    fanBalance: response.data.fan.pointsBalance,
    transaction: response.data.transaction.id,
    referenceId,
  };
});

await run("POST /api/rewards/redeem simulateOnly", async () => {
  assert(context.rewardId, "demo reward missing");
  const response = await postJson("/api/rewards/redeem", {
    programId: context.programId,
    fanId: context.fanId,
    rewardId: context.rewardId,
    simulateOnly: true,
  });
  assert(response.success, "reward eligibility success");
  assert(typeof response.data.eligibility.eligible === "boolean", "eligibility boolean missing");
  assert(typeof response.data.eligibility.reason === "string", "eligibility reason missing");
  return response.data.eligibility;
});

await run("POST /api/fan-pass/simulate", async () => {
  const response = await postJson("/api/fan-pass/simulate", {
    followerCount: 50_000,
    strongEngagementRate: 2.5,
    expectedConversionRate: 0.5,
    passPrice: 19,
    supply: 500,
  });
  assert(response.success, "fan-pass simulation success");
  assert(response.data.simulation.estimatedRevenue > 0, "fan-pass estimated revenue missing");
  assert(response.data.simulation.supplyRemaining >= 0, "fan-pass supply remaining invalid");
  return response.data.simulation;
});

await run("POST /api/token-economy/simulate", async () => {
  const response = await postJson("/api/token-economy/simulate", {
    programId: context.programId,
    totalSupply: 1_000_000,
    isTransferable: false,
  });
  assert(response.success, "token economy success");
  assert(response.data.economy.isSpeculative === false, "token economy must be non-speculative");
  assert(Array.isArray(response.data.validation.errors), "validation errors array missing");
  return {
    totalSupply: response.data.economy.totalSupply,
    speculative: response.data.economy.isSpeculative,
    validationErrors: response.data.validation.errors.length,
  };
});

await run("POST /api/agent/recommendations + execute_mock", async () => {
  const response = await postJson("/api/agent/recommendations", { programId: context.programId });
  assert(response.success, "agent recommendations success");
  const recommendation = response.data.recommendations.find((item) => item.status === "pending");
  assert(recommendation, "pending recommendation missing");
  const action = await postJson("/api/agent/recommendations/action", {
    recommendationId: recommendation.id,
    action: "execute_mock",
  });
  assert(action.success, "agent mock action success");
  assert(action.data.recommendation.status === "executed", "recommendation should be executed");
  assert(action.meta.externalActionsPerformed === 0, "mock execution must not perform external actions");
  return {
    recommendations: response.data.recommendations.length,
    executed: action.data.recommendation.id,
    externalActionsPerformed: action.meta.externalActionsPerformed,
  };
});

await run("POST /api/b2b-agent/run", async () => {
  const response = await postJson("/api/b2b-agent/run", {
    location: "Fort-de-France",
    campaignBudget: 200,
  });
  assert(response.success, "b2b run success");
  assert(response.meta.mockMode === true, "b2b run should report mock mode");
  assert(response.meta.externalCalls === 0, "b2b run must not call external providers in MVP mode");
  assert(response.data.businesses.length > 0, "b2b businesses missing");
  assert(response.data.bestOpportunity.platformCommission > 0, "platform commission missing");
  assert(response.data.campaignEconomics.paymentStatus === "simulated_paid", "payment should be simulated");
  return {
    businesses: response.data.businesses.length,
    platformCommission: response.data.bestOpportunity.platformCommission,
    fanRewardBudget: response.data.bestOpportunity.fanRewardBudget,
    paymentStatus: response.data.campaignEconomics.paymentStatus,
    externalCalls: response.meta.externalCalls,
  };
});

await run("GET /api/blockchain/status", async () => {
  const response = await getJson("/api/blockchain/status");
  assert(response.success, "blockchain status success");
  assert(response.data.abiStatus.AuraLoyaltyPoints > 0, "AuraLoyaltyPoints ABI missing");
  assert(response.data.abiStatus.AuraFanPass > 0, "AuraFanPass ABI missing");
  assert(response.data.abiStatus.AuraRewardRegistry > 0, "AuraRewardRegistry ABI missing");
  return {
    mode: response.data.status.mode,
    auraLoyaltyPointsAbi: response.data.abiStatus.AuraLoyaltyPoints,
    fanPassAbi: response.data.abiStatus.AuraFanPass,
    rewardRegistryAbi: response.data.abiStatus.AuraRewardRegistry,
  };
});

await run("GET /api/system/health after mutations", async () => {
  assert(context.initialHealth, "initial health context missing");
  const response = await getJson("/api/system/health", { publicRoute: true });
  assert(response.success, "post-journey health success");
  assert(response.data.loyalty.transactions >= context.initialHealth.loyalty.transactions + 2, "loyalty mutations not visible in health");
  assert(
    response.data.b2b.platformRevenue > context.initialHealth.b2b.platformRevenue,
    "b2b monetization result not visible in health",
  );
  return {
    loyaltyTransactions: response.data.loyalty.transactions,
    b2bRuns: response.data.b2b.runs,
    platformRevenue: response.data.b2b.platformRevenue,
  };
});

const success = results.every((result) => result.status === "success");
console.log(JSON.stringify({ script: "smoke-journey", baseUrl, success, results }, null, 2));
if (!success) process.exitCode = 1;

async function run(label, fn) {
  try {
    const output = await fn();
    results.push({ label, status: "success", output });
  } catch (error) {
    results.push({
      label,
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getJson(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: options.publicRoute ? undefined : authHeaders(),
      });
      return await parseJsonResponse(response, path);
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isRetryableReadError(error)) break;
      await delay(350 * attempt);
    }
  }
  throw lastError;
}

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return parseJsonResponse(response, path);
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  return headers;
}

async function parseJsonResponse(response, path) {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && !apiToken) {
    throw new Error(`${path} returned 401. Set AURA_API_TOKEN in the smoke script environment to match the server token.`);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error?.code || ""} ${payload.error?.message || response.statusText}`.trim());
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRetryableReadError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /^(404|500|502|503|504)\b/.test(message) || /fetch failed|ECONNRESET|ECONNREFUSED/i.test(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function containsKnownSecret(payload) {
  const haystack = JSON.stringify(payload);
  const candidates = [
    process.env.APP_SECRET,
    process.env.STRIPE_SECRET_KEY,
    process.env.AURA_API_TOKEN,
    process.env.INSTAGRAM_ACCESS_TOKEN,
    process.env.META_DEBUG_ACCESS_TOKEN,
  ].filter((value) => value && value.length >= 8);
  return candidates.some((secret) => haystack.includes(secret));
}
