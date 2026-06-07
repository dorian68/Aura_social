/**
 * smoke-auth.mjs — Creator Auth System smoke test (12 assertions)
 * Requires: server running at SMOKE_BASE_URL (default: http://localhost:3009)
 */

const BASE = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || "3009"}`;
const TS = Date.now();
const results = [];
let passed = 0;
let failed = 0;

async function assert(label, fn) {
  try {
    const output = await fn();
    results.push({ label, status: "success", output });
    passed++;
  } catch (err) {
    results.push({ label, status: "fail", error: err.message });
    failed++;
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function post(path, body, cookies = "") {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookies ? { cookie: cookies } : {}) },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  return { status: r.status, headers: r.headers, body: d };
}

async function get(path, cookies = "") {
  const r = await fetch(`${BASE}${path}`, {
    headers: { ...(cookies ? { cookie: cookies } : {}) },
  });
  const d = await r.json().catch(() => ({}));
  return { status: r.status, body: d };
}

function getCookie(headers) {
  const raw = headers.get("set-cookie") || "";
  // Extract aura_session=xxx; keep just the cookie value pair
  const match = raw.match(/aura_session=[^;]+/);
  return match ? match[0] : "";
}

// ── Setup: create a unique test account ───────────────────────────────────────
const testEmail = `smoke-auth-${TS}@test.aura`;
const testPassword = "smoke-password-123";
let sessionCookie = "";
let creatorId = "";
let resetToken = "";

// 1. Signup creates creator + session cookie
await assert("POST /api/auth/signup — creates account and session", async () => {
  const { status, headers, body } = await post("/api/auth/signup", {
    displayName: `Smoke Auth ${TS}`,
    email: testEmail,
    password: testPassword,
    niche: "music",
  });
  ok(status === 200, `Expected 200, got ${status}`);
  ok(body.success, `signup failed: ${body.error?.message}`);
  ok(body.data?.creator?.id, "No creator.id in signup response");
  ok(body.data?.creator?.email === testEmail, "Email mismatch in response");
  sessionCookie = getCookie(headers);
  ok(sessionCookie, "No aura_session cookie set after signup");
  creatorId = body.data.creator.id;
  return { creatorId: creatorId.slice(0, 8), cookieSet: !!sessionCookie };
});

// 2. GET /api/auth/me returns creator from session cookie
await assert("GET /api/auth/me — returns creator from session", async () => {
  const { status, body } = await get("/api/auth/me", sessionCookie);
  ok(status === 200, `Expected 200, got ${status}`);
  ok(body.success, `me failed: ${body.error?.message}`);
  ok(body.data?.creator?.id === creatorId, "Creator ID mismatch");
  ok(body.data?.creator?.displayName, "No displayName in me response");
  return { displayName: body.data.creator.displayName, communities: body.data.communities?.length ?? 0 };
});

// 3. GET /api/auth/me without cookie returns 401
await assert("GET /api/auth/me — 401 without cookie", async () => {
  const { status, body } = await get("/api/auth/me");
  ok(status === 401, `Expected 401, got ${status}`);
  ok(!body.success, "Expected success: false for unauthenticated me");
  return { status, code: body.error?.code };
});

// 4. Login with correct credentials creates new session
await assert("POST /api/auth/login — correct credentials → session", async () => {
  const { status, headers, body } = await post("/api/auth/login", {
    email: testEmail,
    password: testPassword,
  });
  ok(status === 200, `Expected 200, got ${status}`);
  ok(body.success, `login failed: ${body.error?.message}`);
  ok(body.data?.creator?.id === creatorId, "Creator ID mismatch on login");
  const newCookie = getCookie(headers);
  ok(newCookie, "No session cookie set after login");
  return { sessionCreated: true, creatorId: creatorId.slice(0, 8) };
});

// 5. Login with wrong password returns INVALID_CREDENTIALS
await assert("POST /api/auth/login — wrong password → INVALID_CREDENTIALS", async () => {
  const { status, body } = await post("/api/auth/login", {
    email: testEmail,
    password: "definitely-wrong-password",
  });
  ok(!body.success, "Expected failure for wrong password");
  ok(body.error?.code === "INVALID_CREDENTIALS", `Expected INVALID_CREDENTIALS, got ${body.error?.code}`);
  return { code: body.error.code };
});

// 6. Login with unknown email returns INVALID_CREDENTIALS (timing-safe)
await assert("POST /api/auth/login — unknown email → INVALID_CREDENTIALS (timing-safe)", async () => {
  const { status, body } = await post("/api/auth/login", {
    email: `nonexistent-${TS}@test.aura`,
    password: testPassword,
  });
  ok(!body.success, "Expected failure for unknown email");
  ok(body.error?.code === "INVALID_CREDENTIALS", `Expected INVALID_CREDENTIALS, got ${body.error?.code}`);
  return { code: body.error.code };
});

// 7. Duplicate email returns EMAIL_TAKEN
await assert("POST /api/auth/signup — duplicate email → EMAIL_TAKEN", async () => {
  const { body } = await post("/api/auth/signup", {
    displayName: "Duplicate",
    email: testEmail,
    password: testPassword,
    niche: "music",
  });
  ok(!body.success, "Expected failure for duplicate email");
  ok(body.error?.code === "EMAIL_TAKEN", `Expected EMAIL_TAKEN, got ${body.error?.code}`);
  return { code: body.error.code };
});

// 8. Password too short returns structured error
await assert("POST /api/auth/signup — short password → structured error", async () => {
  const { body } = await post("/api/auth/signup", {
    displayName: "Short",
    email: `short-${TS}@test.aura`,
    password: "abc",
    niche: "music",
  });
  ok(!body.success, "Expected failure for short password");
  ok(body.error?.code, "No error code returned");
  return { code: body.error.code };
});

// 9. Forgot-password returns success regardless of email existence
await assert("POST /api/auth/forgot-password — returns success + token in dev mode", async () => {
  const { status, body } = await post("/api/auth/forgot-password", { email: testEmail });
  ok(status === 200, `Expected 200, got ${status}`);
  ok(body.success, `forgot-password failed: ${body.error?.message}`);
  // In dev mode the reset token is returned in the response for testability
  ok(body.data?.resetToken || body.meta?.devResetToken, "No dev reset token in response");
  resetToken = body.data?.resetToken || body.meta?.devResetToken;
  return { tokenPresent: !!resetToken, devMode: true };
});

// 10. Reset password with valid token updates credentials
await assert("POST /api/auth/reset-password — valid token → password updated", async () => {
  const newPassword = "new-smoke-password-456";
  const { status, body } = await post("/api/auth/reset-password", {
    token: resetToken,
    password: newPassword,
  });
  ok(status === 200, `Expected 200, got ${status}`);
  ok(body.success, `reset-password failed: ${body.error?.message}`);
  // Verify new password works
  const loginRes = await post("/api/auth/login", { email: testEmail, password: newPassword });
  ok(loginRes.body.success, "Login with new password failed after reset");
  return { passwordUpdated: true };
});

// 11. Reset password with used/invalid token returns error
await assert("POST /api/auth/reset-password — used token → error", async () => {
  const { status, body } = await post("/api/auth/reset-password", {
    token: resetToken,
    password: "another-password-789",
  });
  ok(!body.success, "Expected failure for reused token");
  ok(body.error?.code, `No error code: ${JSON.stringify(body)}`);
  return { code: body.error.code };
});

// 12. Logout invalidates session
await assert("POST /api/auth/logout — session becomes invalid", async () => {
  const { status: s1, body: b1 } = await post("/api/auth/logout", {}, sessionCookie);
  ok(b1.success, `logout failed: ${b1.error?.message}`);
  // After logout, /me should return 401
  const { status: s2, body: b2 } = await get("/api/auth/me", sessionCookie);
  ok(s2 === 401, `Expected 401 after logout, got ${s2}`);
  return { loggedOut: true, meAfterLogout: s2 };
});

// ── Report ────────────────────────────────────────────────────────────────────
const report = {
  script: "smoke-auth",
  baseUrl: BASE,
  success: failed === 0,
  passed,
  failed,
  results,
};

console.log(JSON.stringify(report, null, 2));
if (failed > 0) process.exitCode = 1;
