import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import {
  getCommunityBySlug, getFanByEmail, getMembership,
  getChallengeById, getCompletion, createCompletion, updateCompletionStatus, awardPoints,
} from "@/lib/superfan/db";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await readJsonBody(req);
    const { email, challengeId, proofText, proofUrl } = body as Record<string, string>;

    if (!email || !email.includes("@")) throw new DomainError("INVALID_EMAIL", "A valid email is required.", 400);
    if (!challengeId) throw new DomainError("MISSING_CHALLENGE", "challengeId is required.", 400);

    const community = getCommunityBySlug(slug);
    if (!community) throw new DomainError("CLUB_NOT_FOUND", "Club not found.", 404);

    const fan = getFanByEmail(email);
    if (!fan) throw new DomainError("FAN_NOT_FOUND", "No fan found with this email. Join the club first.", 404);

    const membership = getMembership(community.id, fan.id);
    if (!membership) throw new DomainError("NOT_A_MEMBER", "You must join this club first.", 403);

    const challenge = getChallengeById(challengeId);
    if (!challenge || challenge.communityId !== community.id)
      return fail("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
    if (challenge.status !== "active")
      return fail("CHALLENGE_INACTIVE", "This challenge is no longer active.", 400);

    // Prevent duplicate submission
    const existing = getCompletion(challengeId, fan.id);
    if (existing) {
      return ok({ alreadySubmitted: true, status: existing.status, completionId: existing.id });
    }

    // Check max completions
    if (challenge.maxCompletions === 1) {
      // Already checked above via getCompletion
    }

    const proofUrlFinal = proofUrl?.trim() || undefined;
    const completion = createCompletion({
      challengeId,
      fanId: fan.id,
      communityId: community.id,
      proofUrl: proofUrlFinal,
      status: challenge.verificationMethod === "auto" ? "approved" : "pending",
    });

    // Auto-approve: award points immediately
    if (completion.status === "approved") {
      awardPoints(fan.id, community.id, challenge.pointsReward, "challenge_completion", challengeId, challenge.title);
      return ok({
        submitted: true,
        autoApproved: true,
        pointsEarned: challenge.pointsReward,
        completionId: completion.id,
      });
    }

    // Manual: pending creator review
    return ok({
      submitted: true,
      autoApproved: false,
      status: "pending",
      completionId: completion.id,
      message: "Submitted! The creator will review and award your points.",
    });
  } catch (e) { return handleApiError(e, "SUBMIT_ERROR"); }
}
