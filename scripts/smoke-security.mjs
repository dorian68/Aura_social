/* Security smoke test — validates the API auth gate (middleware.ts).
   The server under test MUST be started with AURA_API_TOKEN set (and
   DEMO_MODE != true), otherwise the gate is in dev-bypass mode and this test
   cannot prove 401s. Usage:
     AURA_API_TOKEN=<same-as-server> SMOKE_BASE_URL=http://localhost:3100 node scripts/smoke-security.mjs */

const BASE = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || "3000"}`;
const TOKEN = process.env.AURA_API_TOKEN || "";

const results = [];
function check(label, pass, detail = "") {
  results.push({ label, pass });
  console.log(`${pass ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function call(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

async function main() {
  console.log(`[smoke:security] target: ${BASE}`);
  if (!TOKEN) {
    console.error("[smoke:security] FATAL: AURA_API_TOKEN is not set — start the server with a token and pass the same one here. The gate is in dev-bypass without it.");
    process.exitCode = 1;
    return;
  }

  // 1. Public routes reachable without auth
  check("public: GET /api/system/health not blocked", (await call("/api/system/health")).status !== 401);
  check("public: GET /api/meta/config not blocked", (await call("/api/meta/config")).status !== 401);

  // 2. Sensitive routes BLOCKED without auth (401)
  const noAuthCases = [
    ["GET /api/workspace/state", { path: "/api/workspace/state" }],
    ["POST /api/meta/runtime-config (secret write)", { path: "/api/meta/runtime-config", method: "POST", body: { appId: "HACK", appSecret: "HACK" } }],
    ["GET /api/meta/debug/logs (log leak)", { path: "/api/meta/debug/logs" }],
    ["POST /api/operator/execute", { path: "/api/operator/execute", method: "POST", body: { tool: "getLoyaltyStats" } }],
    ["POST /api/agent/recommendations", { path: "/api/agent/recommendations", method: "POST", body: {} }],
    ["POST /api/b2b-agent/run", { path: "/api/b2b-agent/run", method: "POST", body: {} }],
  ];
  for (const [label, opts] of noAuthCases) {
    const r = await call(opts.path, opts);
    const blocked = r.status === 401;
    check(`blocked w/o auth: ${label} → 401`, blocked, `got ${r.status}`);
    if (label.includes("secret write")) {
      check("secret write actually rejected (no 2xx)", r.status >= 400 && r.status < 500, `status ${r.status}`);
    }
  }

  // 3. Structured error envelope on 401
  const denied = await call("/api/workspace/state");
  check("401 body is structured {success:false,error.code}",
    denied.json && denied.json.success === false && !!denied.json.error?.code,
    JSON.stringify(denied.json));

  // 4. Same sensitive route ALLOWED with a valid token (not 401)
  const authed = await call("/api/workspace/state", { token: TOKEN });
  check("allowed w/ valid token: GET /api/workspace/state ≠ 401", authed.status !== 401, `got ${authed.status}`);

  // 5. Wrong token still blocked
  const wrong = await call("/api/workspace/state", { token: "definitely-wrong-token" });
  check("blocked w/ wrong token → 401", wrong.status === 401, `got ${wrong.status}`);

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n[smoke:security] ${results.filter((r) => r.pass).length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("[smoke:security] FAILED:", failed.map((r) => r.label).join(" | "));
    process.exitCode = 1;
  } else {
    console.log("[smoke:security] OK — sensitive routes are gated, public routes open, errors structured.");
  }
}

main().catch((e) => { console.error("[smoke:security] crashed:", e); process.exitCode = 1; });
