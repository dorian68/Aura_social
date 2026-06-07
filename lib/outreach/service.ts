import { DomainError } from "@/lib/domainError";
import { getB2BAgentState, setB2BAgentState } from "@/lib/b2b-agent/store";
import type { OutreachDraft } from "@/lib/b2b-agent/types";
import { recordOutreachDelivery } from "./repository";

export function getOutreachReadiness() {
  return {
    enabled: process.env.OUTREACH_SENDING_ENABLED === "true",
    provider: process.env.OUTREACH_PROVIDER || "resend",
    hasApiKey: Boolean(process.env.EMAIL_PROVIDER_API_KEY),
    hasFromAddress: Boolean(process.env.EMAIL_PROVIDER_FROM),
  };
}

export function approveOutreachDraft(input: {
  outreachDraftId: string;
  subject: string;
}) {
  const state = getB2BAgentState();
  const draft = state.outreachDrafts.find((item) => item.id === input.outreachDraftId);
  if (!draft) {
    throw new DomainError("OUTREACH_DRAFT_NOT_FOUND", "Outreach draft was not found.", 404);
  }
  const approved: OutreachDraft = {
    ...draft,
    status: "approved",
    approvedBy: input.subject,
    approvedAt: new Date().toISOString(),
  };
  setB2BAgentState({
    ...state,
    outreachDrafts: replaceById(state.outreachDrafts, approved),
  });
  return approved;
}

export async function sendOutreachDraft(input: {
  workspaceId: string;
  outreachDraftId: string;
  recipient?: string;
  dryRun?: boolean;
}) {
  const state = getB2BAgentState();
  const draft = state.outreachDrafts.find((item) => item.id === input.outreachDraftId);
  if (!draft) {
    throw new DomainError("OUTREACH_DRAFT_NOT_FOUND", "Outreach draft was not found.", 404);
  }
  if (draft.status !== "approved") {
    throw new DomainError(
      "OUTREACH_APPROVAL_REQUIRED",
      "Outreach draft must be explicitly approved before delivery.",
      409,
    );
  }
  const business = state.businesses.find((item) => item.id === draft.businessId);
  const recipient = cleanEmail(input.recipient || business?.email || "");
  if (!recipient) {
    throw new DomainError(
      "OUTREACH_RECIPIENT_REQUIRED",
      "A valid recipient email is required.",
      400,
    );
  }

  const dryRun = input.dryRun !== false;
  const attemptedAt = new Date().toISOString();
  if (dryRun) {
    const delivered: OutreachDraft = {
      ...draft,
      delivery: {
        provider: "dry_run",
        recipient,
        status: "dry_run",
        attemptedAt,
      },
    };
    setB2BAgentState({
      ...state,
      outreachDrafts: replaceById(state.outreachDrafts, delivered),
    });
    const record = recordOutreachDelivery({
      workspaceId: input.workspaceId,
      outreachDraftId: draft.id,
      provider: "dry_run",
      recipient,
      status: "dry_run",
      dryRun: true,
    });
    return { draft: delivered, delivery: record, externalCalls: 0 };
  }

  const readiness = getOutreachReadiness();
  if (!readiness.enabled) {
    throw new DomainError(
      "OUTREACH_SENDING_DISABLED",
      "Real outreach sending is disabled.",
      409,
    );
  }
  if (
    readiness.provider !== "resend" ||
    !readiness.hasApiKey ||
    !readiness.hasFromAddress
  ) {
    throw new DomainError(
      "OUTREACH_PROVIDER_NOT_CONFIGURED",
      "Resend API key and sender address are required for real outreach.",
      503,
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_PROVIDER_FROM,
      to: [recipient],
      subject: draft.subject,
      text: draft.message,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  if (!response.ok || !payload.id) {
    recordOutreachDelivery({
      workspaceId: input.workspaceId,
      outreachDraftId: draft.id,
      provider: "resend",
      recipient,
      status: "failed",
      dryRun: false,
    });
    throw new DomainError(
      "OUTREACH_PROVIDER_FAILED",
      payload.message || `Outreach provider returned HTTP ${response.status}.`,
      502,
    );
  }

  const delivered: OutreachDraft = {
    ...draft,
    status: "sent",
    delivery: {
      provider: "resend",
      recipient,
      status: "sent",
      providerMessageId: payload.id,
      attemptedAt,
    },
  };
  setB2BAgentState({
    ...state,
    outreachDrafts: replaceById(state.outreachDrafts, delivered),
  });
  const record = recordOutreachDelivery({
    workspaceId: input.workspaceId,
    outreachDraftId: draft.id,
    provider: "resend",
    recipient,
    status: "sent",
    providerMessageId: payload.id,
    dryRun: false,
  });
  return { draft: delivered, delivery: record, externalCalls: 1 };
}

function cleanEmail(value: string) {
  const candidate = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : "";
}

function replaceById(drafts: OutreachDraft[], draft: OutreachDraft) {
  return drafts.map((item) => (item.id === draft.id ? draft : item));
}
