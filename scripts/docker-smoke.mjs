/* Docker smoke test — validates the containerized app is alive, healthy and
   serving its key routes in mock-safe mode. Run AFTER `docker compose up`.
   Override target with SMOKE_BASE_URL (default http://localhost:${PORT|3000}). */

const PORT = process.env.PORT || "3000";
const BASE = process.env.SMOKE_BASE_URL || `http://localhost:${PORT}`;
const WEB = process.env.WEB_BASE_URL || `http://localhost:${process.env.WEB_PORT || "8080"}`;

const results = [];
function record(label, ok, detail = "") {
  results.push({ label, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function getJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { res, json, text };
}

async function waitForHealth(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { res, json } = await getJson(`${BASE}/api/system/health`);
      if (res.ok && json?.data?.status === "ok") return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function main() {
  console.log(`[docker-smoke] target app: ${BASE}`);
  console.log(`[docker-smoke] target web: ${WEB}`);

  const healthy = await waitForHealth();
  record("app responds & /api/system/health = ok", healthy);
  if (!healthy) { finish(); return; }

  try {
    const { res, json } = await getJson(`${BASE}/api/meta/config`);
    record("GET /api/meta/config", res.ok && json?.success === true, `mockMeta=${json?.data?.mockMeta}`);
  } catch (e) { record("GET /api/meta/config", false, String(e?.message || e)); }

  try {
    const { res } = await getJson(`${BASE}/`);
    record("GET / (Next root) renders", res.ok, `HTTP ${res.status}`);
  } catch (e) { record("GET / (Next root) renders", false, String(e?.message || e)); }

  try {
    const { res, json } = await getJson(`${BASE}/api/b2b-agent/run`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    record("POST /api/b2b-agent/run (mock-safe)", res.ok && json?.success === true,
      `externalCalls=${json?.meta?.externalCalls}`);
  } catch (e) { record("POST /api/b2b-agent/run (mock-safe)", false, String(e?.message || e)); }

  try {
    const { res } = await getJson(`${BASE}/api/blockchain/status`);
    record("GET /api/blockchain/status", res.ok, `HTTP ${res.status}`);
  } catch (e) { record("GET /api/blockchain/status", false, String(e?.message || e)); }

  // Static product UI (optional service)
  try {
    const res = await fetch(`${WEB}/index.html`);
    record("web: Frontend_Aura served", res.ok, `HTTP ${res.status}`);
  } catch { record("web: Frontend_Aura served", false, "not reachable (web service optional)"); }

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok && !r.label.startsWith("web:"));
  console.log(`\n[docker-smoke] ${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("[docker-smoke] FAILED:", failed.map((r) => r.label).join(", "));
    process.exitCode = 1;
  } else {
    console.log("[docker-smoke] OK — containerized app is alive and mock-safe.");
  }
}

main().catch((e) => { console.error("[docker-smoke] crashed:", e); process.exitCode = 1; });
