import { NextResponse } from "next/server";
import { getQRByCode, recordQRScan, getChallengeById, getCompletion, createCompletion, awardPoints, updateCompletionStatus } from "@/lib/superfan/db";
import { DEFAULT_POINTS } from "@/lib/superfan/types";
import { fail } from "@/lib/apiResponse";

function absoluteUrl(path: string, req: Request): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const qr = getQRByCode(code);
  if (!qr) return fail("QR_NOT_FOUND", "QR code not found.", 404);

  const url = new URL(req.url);
  const fanToken = url.searchParams.get("f"); // fan identification token (JWT or fan ID for MVP)

  // Log scan
  recordQRScan(qr.id, fanToken ?? undefined);

  // If linked to a challenge + we have a fan ID, auto-approve
  if (qr.challengeId && fanToken) {
    const challenge = getChallengeById(qr.challengeId);
    if (challenge && challenge.status === "active") {
      const existing = getCompletion(qr.challengeId, fanToken);
      if (!existing) {
        // Create auto-approved completion
        const completion = createCompletion({ challengeId: qr.challengeId, fanId: fanToken, communityId: challenge.communityId, status: "approved" });
        awardPoints(fanToken, challenge.communityId, challenge.pointsReward, "qr_scan", qr.id, challenge.title);
        updateCompletionStatus(completion.id, "approved", "auto_qr");
        // Check partner campaign for extra points
        if (qr.campaignId) {
          awardPoints(fanToken, challenge.communityId, DEFAULT_POINTS.qr_scan, "qr_scan", qr.id, "Partner visit bonus");
        }
        // Redirect to confirmation page
        return NextResponse.redirect(absoluteUrl(`/club/qr-confirm?points=${challenge.pointsReward}&challenge=${encodeURIComponent(challenge.title)}`, req));
      }
    }
  }

  // Redirect to the destination URL
  if (qr.redirectUrl) {
    return NextResponse.redirect(absoluteUrl(qr.redirectUrl, req));
  }

  return NextResponse.json({ scanned: true, qrId: qr.id });
}
