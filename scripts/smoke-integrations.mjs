import Stripe from "stripe";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3173";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const apiToken = process.env.AURA_API_TOKEN || "";
const results = [];

if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is required.");

let run;
await check("reset deterministic fixture", async () => {
  const response = await jsonRequest("/api/test/reset", { method: "POST", body: {} });
  assert(response.status === 200, `expected 200, got ${response.status}`);
  return response.payload.data;
});

await check("create B2B campaign and outreach draft", async () => {
  const response = await jsonRequest("/api/b2b-agent/run", {
    method: "POST",
    body: { location: "Fort-de-France", campaignBudget: 200 },
  });
  assert(response.status === 200, `expected 200, got ${response.status}`);
  run = response.payload.data;
  return {
    opportunityId: run.bestOpportunity.id,
    campaignId: run.sponsoredCampaign.id,
    outreachDraftId: run.pitch.id,
  };
});

await check("outreach requires approval", async () => {
  const response = await jsonRequest(
    `/api/b2b-agent/outreach/${run.pitch.id}/send`,
    {
      method: "POST",
      body: { recipient: "partner@example.com", dryRun: true },
    },
  );
  assert(response.status === 409, `expected 409, got ${response.status}`);
  assert(response.payload.error.code === "OUTREACH_APPROVAL_REQUIRED", "approval error missing");
  return response.payload.error;
});

await check("approve and dry-run outreach", async () => {
  const approved = await jsonRequest(
    `/api/b2b-agent/outreach/${run.pitch.id}/approve`,
    { method: "POST", body: {} },
  );
  assert(approved.status === 200, `approval expected 200, got ${approved.status}`);
  const sent = await jsonRequest(
    `/api/b2b-agent/outreach/${run.pitch.id}/send`,
    {
      method: "POST",
      body: { recipient: "partner@example.com", dryRun: true },
    },
  );
  assert(sent.status === 200, `dry-run expected 200, got ${sent.status}`);
  assert(sent.payload.meta.externalCalls === 0, "dry-run made an external call");
  assert(sent.payload.data.delivery.dryRun === true, "delivery was not marked dry-run");
  return sent.payload.data.delivery;
});

const event = {
  id: `evt_aura_${Date.now()}`,
  object: "event",
  api_version: "2025-12-15.clover",
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: "checkout.session.completed",
  data: {
    object: {
      id: `cs_test_aura_${Date.now()}`,
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 20000,
      currency: "eur",
      payment_intent: `pi_test_aura_${Date.now()}`,
      metadata: {
        workspaceId: "workspace_aura_demo",
        opportunityId: run.bestOpportunity.id,
        campaignId: run.sponsoredCampaign.id,
      },
    },
  },
};
const payload = JSON.stringify(event);
const signature = Stripe.webhooks.generateTestHeaderString({
  payload,
  secret: webhookSecret,
});

await check("invalid Stripe signature is rejected", async () => {
  const response = await rawRequest("/api/payments/stripe/webhook", payload, "invalid");
  assert(response.status === 400, `expected 400, got ${response.status}`);
  assert(response.payload.error.code === "STRIPE_WEBHOOK_SIGNATURE_INVALID", "signature error missing");
  return response.payload.error;
});

await check("signed Stripe webhook rejects payment amount mismatch", async () => {
  const mismatchedEvent = {
    ...event,
    id: "evt_aura_smoke_mismatch",
    data: {
      object: {
        ...event.data.object,
        id: "cs_aura_smoke_mismatch",
        amount_total: 100,
      },
    },
  };
  const mismatchedPayload = JSON.stringify(mismatchedEvent);
  const mismatchedSignature = Stripe.webhooks.generateTestHeaderString({
    payload: mismatchedPayload,
    secret: webhookSecret,
  });
  const response = await rawRequest(
    "/api/payments/stripe/webhook",
    mismatchedPayload,
    mismatchedSignature,
  );
  assert(response.status === 409, `expected 409, got ${response.status}`);
  assert(
    response.payload.error.code === "STRIPE_PAYMENT_MISMATCH",
    "payment mismatch error missing",
  );
  return response.payload.error;
});

await check("signed Stripe webhook marks campaign paid", async () => {
  const response = await rawRequest("/api/payments/stripe/webhook", payload, signature);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(response.payload.meta.signatureVerified === true, "signature was not verified");
  const status = await jsonRequest("/api/payments/stripe/status");
  const payment = status.payload.data.payments.find(
    (item) => item.checkoutSessionId === event.data.object.id,
  );
  assert(payment?.status === "paid", "payment record is not paid");
  return payment;
});

await check("Stripe event processing is idempotent", async () => {
  const response = await rawRequest("/api/payments/stripe/webhook", payload, signature);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(response.payload.data.duplicate === true, "duplicate event was processed twice");
  return response.payload.data;
});

const success = results.every((result) => result.status === "success");
console.log(JSON.stringify({ script: "smoke-integrations", baseUrl, success, results }, null, 2));
if (!success) process.exitCode = 1;

async function jsonRequest(pathname, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
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

async function rawRequest(pathname, body, stripeSignature) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": stripeSignature,
    },
    body,
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
