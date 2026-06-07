import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { getChallengeById, getCompletion, createCompletion, awardPoints, updateCompletionStatus } from "@/lib/superfan/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);
    const { fanId, communityId, proofUrl } = body as Record<string, string>;

    if (!fanId || !communityId) throw new DomainError("MISSING_PARAMS", "fanId and communityId are required.", 400);

    const challenge = getChallengeById(id);
    if (!challenge) throw new DomainError("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
    if (challenge.status !== "active") throw new DomainError("CHALLENGE_NOT_ACTIVE", "This challenge has ended.", 400);
    if (challenge.communityId !== communityId) throw new DomainError("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
    if (challenge.expiresAt && new Date(challenge.expiresAt) < new Date()) throw new DomainError("CHALLENGE_EXPIRED", "This challenge has expired.", 400);
    if (challenge.maxCompletions && (challenge.completionCount ?? 0) >= challenge.maxCompletions)
      throw new DomainError("CHALLENGE_FULL", "This challenge is full.", 400);

    const existing = getCompletion(id, fanId);
    if (existing) throw new DomainError("ALREADY_COMPLETED", "You already completed this challenge.", 409);

    const isAutoApproved = ["auto", "honor", "qr", "coupon"].includes(challenge.verificationMethod);
    const completion = createCompletion({ challengeId: id, fanId, communityId, proofUrl: proofUrl || undefined, status: isAutoApproved ? "approved" : "pending" });

    if (isAutoApproved) {
      awardPoints(fanId, communityId, challenge.pointsReward, "challenge_completion", completion.id, challenge.title);
      updateCompletionStatus(completion.id, "approved", "auto");
    }

    return ok({ completion: { ...completion, status: isAutoApproved ? "approved" : "pending" }, pointsAwarded: isAutoApproved ? challenge.pointsReward : 0, requiresApproval: !isAutoApproved });
  } catch (e) { return handleApiError(e, "COMPLETE_CHALLENGE_ERROR"); }
}
