import { getAccessContext } from "@/lib/auth/access";
import { ok } from "@/lib/apiResponse";
import { listPaymentsForWorkspace } from "@/lib/payments/repository";
import { getStripeReadiness } from "@/lib/payments/stripeService";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = getAccessContext(request);
  return ok({
    readiness: getStripeReadiness(),
    payments: listPaymentsForWorkspace(access.workspaceId),
  });
}
