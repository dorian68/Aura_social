const baseUrl = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || "3000"}`;
const apiToken = process.env.AURA_API_TOKEN || "";
const results = [];
let fixture;

await run("reset deterministic fixture", async () => {
  const response = await request("/api/test/reset", { method: "POST", body: {} });
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(response.payload.success === true, "fixture reset failed");
  return response.payload.data;
});

await run("load fixture identifiers", async () => {
  const response = await request("/api/loyalty/demo");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  const state = response.payload.data.state;
  fixture = {
    programId: state.programs[0].id,
    lowBalanceFan: [...state.fans].sort((a, b) => a.pointsBalance - b.pointsBalance)[0],
    reward: [...state.rewards].sort((a, b) => b.costInPoints - a.costInPoints)[0],
  };
  return {
    programId: fixture.programId,
    fanId: fixture.lowBalanceFan.id,
    fanBalance: fixture.lowBalanceFan.pointsBalance,
    rewardId: fixture.reward.id,
    rewardCost: fixture.reward.costInPoints,
  };
});

await expectFailure("invalid JSON is rejected", "/api/loyalty/award", {
  method: "POST",
  rawBody: "{",
  expectedStatus: 400,
  expectedCode: "INVALID_JSON",
});

await expectFailure("unknown fan award is explicit", "/api/loyalty/award", {
  method: "POST",
  body: {
    programId: fixture?.programId,
    fanId: "fan_missing",
    actionType: "manual_bonus",
    pointsOverride: 10,
  },
  expectedStatus: 404,
  expectedCode: "LOYALTY_FAN_NOT_FOUND",
});

await expectFailure("insufficient point redemption is explicit", "/api/loyalty/redeem", {
  method: "POST",
  body: {
    programId: fixture?.programId,
    fanId: fixture?.lowBalanceFan.id,
    points: fixture?.lowBalanceFan.pointsBalance + 1,
  },
  expectedStatus: 409,
  expectedCode: "LOYALTY_INSUFFICIENT_POINTS",
});

await expectFailure("unknown reward is explicit", "/api/rewards/redeem", {
  method: "POST",
  body: {
    programId: fixture?.programId,
    fanId: fixture?.lowBalanceFan.id,
    rewardId: "reward_missing",
  },
  expectedStatus: 404,
  expectedCode: "REWARD_NOT_FOUND",
});

await expectFailure("insufficient reward points are explicit", "/api/rewards/redeem", {
  method: "POST",
  body: {
    programId: fixture?.programId,
    fanId: fixture?.lowBalanceFan.id,
    rewardId: fixture?.reward.id,
  },
  expectedStatus: 409,
  expectedCode: "REWARD_INSUFFICIENT_POINTS",
});

const success = results.every((item) => item.status === "success");
console.log(JSON.stringify({ script: "smoke-negative", baseUrl, success, results }, null, 2));
if (!success) process.exitCode = 1;

async function expectFailure(label, pathname, options) {
  await run(label, async () => {
    const response = await request(pathname, options);
    assert(response.status === options.expectedStatus, `expected ${options.expectedStatus}, got ${response.status}`);
    assert(response.payload.success === false, "expected failure envelope");
    assert(
      response.payload.error?.code === options.expectedCode,
      `expected ${options.expectedCode}, got ${response.payload.error?.code}`,
    );
    return { status: response.status, code: response.payload.error.code };
  });
}

async function request(pathname, options = {}) {
  const headers = {};
  if (options.body !== undefined || options.rawBody !== undefined) headers["Content-Type"] = "application/json";
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  return {
    status: response.status,
    payload: await response.json().catch(() => ({})),
  };
}

async function run(label, fn) {
  try {
    results.push({ label, status: "success", output: await fn() });
  } catch (error) {
    results.push({ label, status: "fail", error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
