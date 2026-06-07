import { getAccessContext } from "@/lib/auth/access";
import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { createStripeCheckout } from "@/lib/payments/stripeService";
import { DomainError } from "@/lib/domainError";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = getAccessContext(request);
    const body = (await readJsonBody(request)) as Record<string, unknown>;
    const result = await createStripeCheckout({
      workspaceId: access.workspaceId,
      opportunityId: String(body.opportunityId || "").trim(),
      successUrl: cleanOptionalUrl(body.successUrl),
      cancelUrl: cleanOptionalUrl(body.cancelUrl),
    });
    return ok(result, { provider: "stripe", externalCalls: 1 });
  } catch (error) {
    return handleApiError(error, "STRIPE_CHECKOUT_FAILED");
  }
}

function cleanOptionalUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DomainError("CHECKOUT_RETURN_URL_INVALID", "Checkout return URL is invalid.", 400);
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new DomainError(
      "CHECKOUT_RETURN_URL_INVALID",
      "Checkout return URL must use HTTPS.",
      400,
    );
  }
  return url.toString();
}
