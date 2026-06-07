import { handleApiError, ok } from "@/lib/apiResponse";
import {
  constructStripeWebhookEvent,
  processStripeWebhook,
} from "@/lib/payments/stripeService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature") || "";
    const rawBody = await request.text();
    const event = constructStripeWebhookEvent(rawBody, signature);
    return ok(processStripeWebhook(event), {
      provider: "stripe",
      signatureVerified: true,
    });
  } catch (error) {
    return handleApiError(error, "STRIPE_WEBHOOK_FAILED");
  }
}
