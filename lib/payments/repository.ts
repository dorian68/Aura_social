import crypto from "node:crypto";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import type { PaymentRecord, PaymentRecordStatus } from "./types";

interface PaymentRow {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  campaign_id: string | null;
  provider: "stripe";
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  created_at: string;
  updated_at: string;
}

export function createStripePaymentRecord(input: {
  workspaceId: string;
  opportunityId: string;
  campaignId?: string;
  checkoutSessionId: string;
  amount: number;
  currency: string;
}) {
  const now = new Date().toISOString();
  const payment: PaymentRecord = {
    id: `payment_${crypto.randomUUID()}`,
    workspaceId: input.workspaceId,
    opportunityId: input.opportunityId,
    campaignId: input.campaignId,
    provider: "stripe",
    checkoutSessionId: input.checkoutSessionId,
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    status: "checkout_created",
    createdAt: now,
    updatedAt: now,
  };
  getAuraDatabase()
    .prepare(
      `INSERT INTO payment_records (
        id, workspace_id, opportunity_id, campaign_id, provider,
        checkout_session_id, payment_intent_id, amount, currency, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    )
    .run(
      payment.id,
      payment.workspaceId,
      payment.opportunityId,
      payment.campaignId || null,
      payment.provider,
      payment.checkoutSessionId,
      payment.amount,
      payment.currency,
      payment.status,
      payment.createdAt,
      payment.updatedAt,
    );
  return payment;
}

export function upsertStripeWebhookPayment(input: {
  workspaceId: string;
  opportunityId: string;
  campaignId?: string;
  checkoutSessionId: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
}) {
  const existing = findStripePaymentBySession(input.checkoutSessionId);
  const now = new Date().toISOString();
  if (existing) {
    getAuraDatabase()
      .prepare(
        `UPDATE payment_records
         SET payment_intent_id = ?, campaign_id = COALESCE(?, campaign_id),
             amount = ?, currency = ?, status = ?, updated_at = ?
         WHERE provider = 'stripe' AND checkout_session_id = ?`,
      )
      .run(
        input.paymentIntentId || null,
        input.campaignId || null,
        input.amount,
        input.currency.toLowerCase(),
        input.status,
        now,
        input.checkoutSessionId,
      );
    return findStripePaymentBySession(input.checkoutSessionId) as PaymentRecord;
  }

  const payment = createStripePaymentRecord({
    workspaceId: input.workspaceId,
    opportunityId: input.opportunityId,
    campaignId: input.campaignId,
    checkoutSessionId: input.checkoutSessionId,
    amount: input.amount,
    currency: input.currency,
  });
  if (input.status !== "checkout_created" || input.paymentIntentId) {
    getAuraDatabase()
      .prepare(
        `UPDATE payment_records
         SET payment_intent_id = ?, status = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.paymentIntentId || null, input.status, now, payment.id);
  }
  return findStripePaymentBySession(input.checkoutSessionId) as PaymentRecord;
}

export function findStripePaymentBySession(checkoutSessionId: string) {
  const row = getAuraDatabase()
    .prepare(
      `SELECT * FROM payment_records
       WHERE provider = 'stripe' AND checkout_session_id = ?`,
    )
    .get(checkoutSessionId) as PaymentRow | undefined;
  return row ? mapPayment(row) : null;
}

export function listPaymentsForWorkspace(workspaceId: string) {
  const rows = getAuraDatabase()
    .prepare(
      `SELECT * FROM payment_records
       WHERE workspace_id = ?
       ORDER BY created_at DESC`,
    )
    .all(workspaceId) as PaymentRow[];
  return rows.map(mapPayment);
}

export function resetProviderOperationState() {
  const database = getAuraDatabase();
  const reset = database.transaction(() => {
    database.prepare("DELETE FROM provider_events").run();
    database.prepare("DELETE FROM payment_records").run();
    database.prepare("DELETE FROM outreach_deliveries").run();
  });
  reset.immediate();
}

export function beginProviderEvent(input: {
  id: string;
  provider: string;
  eventType: string;
  externalId: string;
  payload: unknown;
}) {
  const existing = getAuraDatabase()
    .prepare("SELECT status FROM provider_events WHERE provider = ? AND external_id = ?")
    .get(input.provider, input.externalId) as { status: string } | undefined;
  if (existing?.status === "processed") return "processed";
  if (existing) return "retry";

  getAuraDatabase()
    .prepare(
      `INSERT INTO provider_events (
        id, provider, event_type, external_id, payload_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'received', ?)`,
    )
    .run(
      input.id,
      input.provider,
      input.eventType,
      input.externalId,
      JSON.stringify(input.payload),
      new Date().toISOString(),
    );
  return "received";
}

export function completeProviderEvent(provider: string, externalId: string) {
  getAuraDatabase()
    .prepare(
      `UPDATE provider_events
       SET status = 'processed', processed_at = ?
       WHERE provider = ? AND external_id = ?`,
    )
    .run(new Date().toISOString(), provider, externalId);
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    opportunityId: row.opportunity_id,
    campaignId: row.campaign_id || undefined,
    provider: row.provider,
    checkoutSessionId: row.checkout_session_id || undefined,
    paymentIntentId: row.payment_intent_id || undefined,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
