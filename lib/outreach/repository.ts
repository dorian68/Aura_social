import crypto from "node:crypto";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";

export interface OutreachDeliveryRecord {
  id: string;
  workspaceId: string;
  outreachDraftId: string;
  provider: "dry_run" | "resend";
  recipient: string;
  status: "dry_run" | "sent" | "failed";
  providerMessageId?: string;
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
}

export function recordOutreachDelivery(
  input: Omit<OutreachDeliveryRecord, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();
  const record: OutreachDeliveryRecord = {
    ...input,
    id: `outreach_delivery_${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  };
  getAuraDatabase()
    .prepare(
      `INSERT INTO outreach_deliveries (
        id, workspace_id, outreach_draft_id, provider, recipient, status,
        provider_message_id, dry_run, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.id,
      record.workspaceId,
      record.outreachDraftId,
      record.provider,
      record.recipient,
      record.status,
      record.providerMessageId || null,
      record.dryRun ? 1 : 0,
      record.createdAt,
      record.updatedAt,
    );
  return record;
}

export function listOutreachDeliveries(workspaceId: string) {
  return getAuraDatabase()
    .prepare(
      `SELECT
        id,
        workspace_id AS workspaceId,
        outreach_draft_id AS outreachDraftId,
        provider,
        recipient,
        status,
        provider_message_id AS providerMessageId,
        dry_run AS dryRun,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM outreach_deliveries
       WHERE workspace_id = ?
       ORDER BY created_at DESC`,
    )
    .all(workspaceId);
}
