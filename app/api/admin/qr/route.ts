import { ok, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { createQRCode } from "@/lib/superfan/db";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { campaignId, challengeId, redirectUrl } = body as Record<string, string>;
    if (!redirectUrl) throw new DomainError("MISSING_REDIRECT_URL", "redirectUrl is required.", 400);
    const qr = createQRCode({ campaignId: campaignId || undefined, challengeId: challengeId || undefined, redirectUrl });
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3009";
    const scanUrl = `${base}/api/qr/${qr.code}`;
    return ok({ qr, scanUrl, code: qr.code });
  } catch (e) { return handleApiError(e, "CREATE_QR_ERROR"); }
}
