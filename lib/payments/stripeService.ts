import Stripe from "stripe";
import { DomainError } from "@/lib/domainError";
import {
  beginProviderEvent,
  completeProviderEvent,
  createStripePaymentRecord,
  upsertStripeWebhookPayment,
} from "./repository";
import { getB2BAgentState, setB2BAgentState } from "@/lib/b2b-agent/store";
import type { SponsoredRewardCampaign } from "@/lib/b2b-agent/types";

export function getStripeReadiness() {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const testMode = secretKey.startsWith("sk_test_");
  return {
    configured: Boolean(secretKey && webhookSecret),
    hasSecretKey: Boolean(secretKey),
    hasWebhookSecret: Boolean(webhookSecret),
    testMode,
    paymentsEnabled: process.env.AURA_ALLOW_REAL_PAYMENTS === "true",
  };
}

export async function createStripeCheckout(input: {
  workspaceId: string;
  opportunityId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const readiness = getStripeReadiness();
  if (!readiness.paymentsEnabled) {
    throw new DomainError(
      "PAYMENTS_DISABLED",
      "Stripe checkout is disabled. Set AURA_ALLOW_REAL_PAYMENTS=true explicitly.",
      409,
    );
  }
  if (!readiness.configured) {
    throw new DomainError(
      "STRIPE_NOT_CONFIGURED",
      "Stripe test credentials and webhook secret are required.",
      503,
    );
  }
  if (!readiness.testMode && process.env.STRIPE_ALLOW_LIVE_MODE !== "true") {
    throw new DomainError(
      "STRIPE_TEST_MODE_REQUIRED",
      "Only Stripe test-mode keys are accepted unless live mode is explicitly enabled.",
      409,
    );
  }

  const state = getB2BAgentState();
  const opportunity = state.opportunities.find((item) => item.id === input.opportunityId);
  if (!opportunity) {
    throw new DomainError("B2B_OPPORTUNITY_NOT_FOUND", "B2B opportunity was not found.", 404);
  }
  const business = state.businesses.find((item) => item.id === opportunity.businessId);
  const campaign = ensurePendingCampaign(state.campaigns, opportunity);
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: input.successUrl || `${baseUrl}/product/dashboard.html?stripe=success`,
    cancel_url: input.cancelUrl || `${baseUrl}/product/dashboard.html?stripe=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(opportunity.proposedBudget * 100),
          product_data: {
            name: `Aura campaign: ${business?.name || opportunity.title}`,
            description: opportunity.proposedOffer.slice(0, 500),
          },
        },
      },
    ],
    metadata: {
      workspaceId: input.workspaceId,
      opportunityId: opportunity.id,
      campaignId: campaign.id,
    },
  });

  createStripePaymentRecord({
    workspaceId: input.workspaceId,
    opportunityId: opportunity.id,
    campaignId: campaign.id,
    checkoutSessionId: session.id,
    amount: Math.round(opportunity.proposedBudget * 100),
    currency: "eur",
  });

  const nextCampaign: SponsoredRewardCampaign = {
    ...campaign,
    status: "payment_pending",
    payment: {
      provider: "stripe",
      status: "pending",
      checkoutSessionId: session.id,
      amount: Math.round(opportunity.proposedBudget * 100),
      currency: "eur",
    },
  };
  setB2BAgentState({
    ...state,
    opportunities: state.opportunities.map((item) =>
      item.id === opportunity.id ? { ...item, status: "payment_pending" } : item,
    ),
    campaigns: replaceById(state.campaigns, nextCampaign),
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    opportunityId: opportunity.id,
    campaignId: campaign.id,
    amount: opportunity.proposedBudget,
    currency: "eur",
    mode: readiness.testMode ? "test" : "live",
  };
}

export function constructStripeWebhookEvent(rawBody: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) {
    throw new DomainError(
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
      "Stripe webhook signing secret is not configured.",
      503,
    );
  }
  try {
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new DomainError(
      "STRIPE_WEBHOOK_SIGNATURE_INVALID",
      "Stripe webhook signature verification failed.",
      400,
    );
  }
}

export function processStripeWebhook(event: Stripe.Event) {
  const state = beginProviderEvent({
    id: `provider_event_${event.id}`,
    provider: "stripe",
    eventType: event.type,
    externalId: event.id,
    payload: event,
  });
  if (state === "processed") return { duplicate: true, eventId: event.id };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      completeProviderEvent("stripe", event.id);
      return { duplicate: false, eventId: event.id, ignored: "payment_not_paid" };
    }
    const workspaceId = session.metadata?.workspaceId || "workspace_aura_demo";
    const opportunityId = session.metadata?.opportunityId || "";
    const campaignId = session.metadata?.campaignId || "";
    if (!opportunityId) {
      throw new DomainError(
        "STRIPE_WEBHOOK_METADATA_INVALID",
        "Stripe checkout metadata is missing opportunityId.",
        400,
      );
    }

    const payment = upsertStripeWebhookPayment({
      workspaceId,
      opportunityId,
      campaignId,
      checkoutSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      amount: session.amount_total || 0,
      currency: session.currency || "eur",
      status: "paid",
    });
    markCampaignPaid({
      opportunityId,
      campaignId,
      checkoutSessionId: session.id,
      paymentIntentId: payment.paymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
    });
  }

  completeProviderEvent("stripe", event.id);
  return { duplicate: false, eventId: event.id, processed: true };
}

function markCampaignPaid(input: {
  opportunityId: string;
  campaignId?: string;
  checkoutSessionId: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
}) {
  const state = getB2BAgentState();
  const opportunity = state.opportunities.find((item) => item.id === input.opportunityId);
  if (!opportunity) {
    throw new DomainError(
      "B2B_OPPORTUNITY_NOT_FOUND",
      "Webhook references an unknown B2B opportunity.",
      404,
    );
  }
  const expectedAmount = Math.round(opportunity.proposedBudget * 100);
  if (input.amount !== expectedAmount || input.currency.toLowerCase() !== "eur") {
    throw new DomainError(
      "STRIPE_PAYMENT_MISMATCH",
      "Stripe payment amount or currency does not match the B2B opportunity.",
      409,
      {
        expectedAmount,
        receivedAmount: input.amount,
        expectedCurrency: "eur",
        receivedCurrency: input.currency,
      },
    );
  }
  const existing =
    state.campaigns.find((item) => item.id === input.campaignId) ||
    state.campaigns.find((item) => item.partnershipOpportunityId === input.opportunityId);
  const campaign = existing || ensurePendingCampaign(state.campaigns, opportunity);
  const paidCampaign: SponsoredRewardCampaign = {
    ...campaign,
    status: "paid",
    payment: {
      provider: "stripe",
      status: "paid",
      checkoutSessionId: input.checkoutSessionId,
      paymentIntentId: input.paymentIntentId,
      amount: input.amount,
      currency: input.currency,
      paidAt: new Date().toISOString(),
    },
  };
  setB2BAgentState({
    ...state,
    opportunities: state.opportunities.map((item) =>
      item.id === opportunity.id ? { ...item, status: "paid" } : item,
    ),
    campaigns: replaceById(state.campaigns, paidCampaign),
  });
}

function ensurePendingCampaign(
  campaigns: SponsoredRewardCampaign[],
  opportunity: {
    id: string;
    creatorId: string;
    businessId: string;
    title: string;
    proposedBudget: number;
    fanRewardBudget: number;
    platformCommission: number;
    proposedOffer: string;
    estimatedReach: number;
    estimatedRedemptions: number;
    estimatedBusinessRevenue: number;
  },
) {
  const existing = campaigns.find(
    (campaign) => campaign.partnershipOpportunityId === opportunity.id,
  );
  if (existing) return existing;
  const now = new Date();
  return {
    id: `campaign_${opportunity.businessId}_${Date.now()}`,
    partnershipOpportunityId: opportunity.id,
    creatorId: opportunity.creatorId,
    businessId: opportunity.businessId,
    name: opportunity.title,
    budget: opportunity.proposedBudget,
    fanRewardBudget: opportunity.fanRewardBudget,
    platformCommission: opportunity.platformCommission,
    rewardType: "local_offer" as const,
    promoCode: `AURA-${opportunity.businessId.slice(-8).toUpperCase()}`,
    pointsBonus: Math.round(opportunity.fanRewardBudget),
    startDate: now.toISOString(),
    endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "payment_pending" as const,
    performance: {
      estimatedReach: opportunity.estimatedReach,
      estimatedRedemptions: opportunity.estimatedRedemptions,
      estimatedBusinessRevenue: opportunity.estimatedBusinessRevenue,
      platformRevenue: opportunity.platformCommission,
    },
  };
}

function replaceById(campaigns: SponsoredRewardCampaign[], campaign: SponsoredRewardCampaign) {
  const exists = campaigns.some((item) => item.id === campaign.id);
  return exists
    ? campaigns.map((item) => (item.id === campaign.id ? campaign : item))
    : [campaign, ...campaigns];
}
