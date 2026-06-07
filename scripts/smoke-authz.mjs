const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3172";
const viewerToken = process.env.AURA_TEST_VIEWER_TOKEN || "";
const creatorToken = process.env.AURA_TEST_CREATOR_TOKEN || "";
const operatorToken = process.env.AURA_TEST_OPERATOR_TOKEN || "";
const adminToken = process.env.AURA_TEST_ADMIN_TOKEN || "";
const results = [];

for (const [label, value] of Object.entries({
  viewerToken,
  creatorToken,
  operatorToken,
  adminToken,
})) {
  if (!value) throw new Error(`${label} is required.`);
}

await check("viewer can read assigned workspace", async () => {
  const response = await request("/api/workspace/state", { token: viewerToken });
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(response.payload.meta.access.role === "viewer", "viewer role was not propagated");
  return response.payload.meta.access;
});

await check("viewer cannot mutate B2B state", async () => {
  const response = await request("/api/b2b-agent/run", {
    method: "POST",
    token: viewerToken,
    body: {},
  });
  assert(response.status === 403, `expected 403, got ${response.status}`);
  assert(response.payload.error.code === "FORBIDDEN", "expected FORBIDDEN");
  return response.payload.error;
});

await check("creator reaches creator mutation", async () => {
  const response = await request("/api/loyalty/award", {
    method: "POST",
    token: creatorToken,
    body: {
      programId: "missing",
      fanId: "missing",
      actionType: "manual_bonus",
      pointsOverride: 1,
    },
  });
  assert(response.status !== 401 && response.status !== 403, `creator was blocked with ${response.status}`);
  return { status: response.status, code: response.payload.error?.code };
});

await check("operator can run B2B workflow", async () => {
  const response = await request("/api/b2b-agent/run", {
    method: "POST",
    token: operatorToken,
    body: { location: "Fort-de-France", campaignBudget: 200 },
  });
  assert(response.status === 200, `expected 200, got ${response.status}`);
  return { runId: response.payload.data.run.id };
});

await check("operator cannot reset fixtures", async () => {
  const response = await request("/api/test/reset", {
    method: "POST",
    token: operatorToken,
    body: {},
  });
  assert(response.status === 403, `expected 403, got ${response.status}`);
  return response.payload.error;
});

await check("admin can reset fixtures", async () => {
  const response = await request("/api/test/reset", {
    method: "POST",
    token: adminToken,
    body: {},
  });
  assert(response.status === 200, `expected 200, got ${response.status}`);
  return response.payload.data;
});

await check("workspace scope is enforced", async () => {
  const response = await request("/api/workspace/state", {
    token: viewerToken,
    workspaceId: "workspace_forbidden",
  });
  assert(response.status === 403, `expected 403, got ${response.status}`);
  assert(response.payload.error.code === "WORKSPACE_FORBIDDEN", "expected WORKSPACE_FORBIDDEN");
  return response.payload.error;
});

const success = results.every((result) => result.status === "success");
console.log(JSON.stringify({ script: "smoke-authz", baseUrl, success, results }, null, 2));
if (!success) process.exitCode = 1;

async function request(pathname, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.workspaceId) headers["x-aura-workspace-id"] = options.workspaceId;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: response.status,
    payload: await response.json().catch(() => ({})),
  };
}

async function check(label, operation) {
  try {
    results.push({ label, status: "success", output: await operation() });
  } catch (error) {
    results.push({ label, status: "fail", error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
