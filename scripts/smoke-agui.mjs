/* AG-UI smoke test (AG_UI_IMPLEMENTATION_GUIDE §22).
   Validates the SSE endpoint: lifecycle order, text streaming, tool events,
   human-in-the-loop confirmation, secret sanitation, and bad-request handling.
   Usage: SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke-agui.mjs */
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const headers = { "Content-Type": "application/json", Accept: "text/event-stream" };
const authHeaders = process.env.AURA_API_TOKEN ? { Authorization: `Bearer ${process.env.AURA_API_TOKEN}` } : {};
const results = [];

async function run(label, fn) {
  try {
    await fn();
    results.push({ label, status: "success" });
  } catch (error) {
    results.push({ label, status: "fail", error: error instanceof Error ? error.message : String(error) });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function stream(body) {
  const res = await fetch(`${baseUrl}/api/ag-ui/run`, { method: "POST", headers: { ...headers, ...authHeaders }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    return { status: res.status, events: [], text: "", raw: txt };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.replace(/^data:\s?/, "");
      if (raw === "[DONE]") { events.push({ type: "[DONE]" }); continue; }
      try { const e = JSON.parse(raw); events.push(e); if (e.type === "TextMessageContent") text += e.delta; } catch { /* ignore */ }
    }
  }
  return { status: res.status, events, text };
}

await run("GET /api/ag-ui/run returns info", async () => {
  const res = await fetch(`${baseUrl}/api/ag-ui/run`, { headers: authHeaders });
  const json = await res.json();
  assert(json.endpoint === "/api/ag-ui/run", "endpoint info missing");
  assert(json.model, "model not reported");
});

await run("lifecycle + streamed text + tool events", async () => {
  const { events, text } = await stream({ messages: [{ id: "m1", role: "user", content: "run a platform health check" }], state: { route: "/dashboard" } });
  const types = events.map((e) => e.type);
  assert(types[0] === "RunStarted", "first event must be RunStarted");
  assert(types[types.length - 1] === "[DONE]", "stream must end with [DONE]");
  assert(types[types.length - 2] === "RunFinished", "RunFinished must precede [DONE]");
  assert(types.includes("StateSnapshot"), "missing StateSnapshot");
  assert(types.includes("TextMessageStart") && types.includes("TextMessageContent") && types.includes("TextMessageEnd"), "missing text message events");
  assert(types.includes("ToolCallStart") && types.includes("ToolCallResult"), "missing tool call events");
  assert(text.trim().length > 0, "assistant text empty");
});

await run("sensitive action requires human confirmation", async () => {
  const { events } = await stream({ messages: [{ id: "m1", role: "user", content: "mint points" }] });
  const approval = events.find((e) => e.type === "Custom" && e.name === "app.approval.required");
  assert(approval, "expected app.approval.required custom event");
  assert(approval.value && approval.value.kind === "confirmation_card", "approval must carry a confirmation_card block");
  assert(approval.value.data && approval.value.data.confirmationToken, "confirmation token missing");
});

await run("secrets are sanitized in state snapshot", async () => {
  const secret = "fake-api-key-sanitization-test-value";
  const { events } = await stream({
    messages: [{ id: "m1", role: "user", content: "what can you do" }],
    state: { route: "/x", apiKey: secret, nested: { accessToken: secret } },
  });
  const snap = events.find((e) => e.type === "StateSnapshot");
  const serialized = JSON.stringify(snap || {});
  assert(!serialized.includes(secret), "secret leaked into StateSnapshot");
});

await run("only allowlisted custom events are emitted", async () => {
  const { events } = await stream({ messages: [{ id: "m1", role: "user", content: "show loyalty stats" }] });
  const allowed = new Set(["app.render_component", "app.approval.required", "app.suggestions", "app.navigate", "app.toast", "app.debug"]);
  const customs = events.filter((e) => e.type === "Custom");
  for (const c of customs) assert(allowed.has(c.name), `unexpected custom event: ${c.name}`);
});

await run("empty messages → 400 bad request", async () => {
  const res = await fetch(`${baseUrl}/api/ag-ui/run`, { method: "POST", headers: { ...headers, ...authHeaders }, body: JSON.stringify({ messages: [] }) });
  assert(res.status === 400, `expected 400, got ${res.status}`);
});

const success = results.every((r) => r.status === "success");
console.log(JSON.stringify({ script: "smoke-agui", baseUrl, success, results }, null, 2));
if (!success) process.exitCode = 1;
