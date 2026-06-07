import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { getCommunityById, getChallengesForCommunity, createChallenge, updateChallenge } from "@/lib/superfan/db";
import type { ChallengeType, VerificationMethod } from "@/lib/superfan/types";

export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    if (!getCommunityById(communityId)) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    return ok({ challenges: getChallengesForCommunity(communityId) });
  } catch (e) { return handleApiError(e, "CHALLENGES_ERROR"); }
}

export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    if (!getCommunityById(communityId)) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const body = await readJsonBody(req);
    const { title, description, pointsReward, type, verificationMethod, maxCompletions, expiresAt, partnerId } = body as Record<string, unknown>;
    if (!title || !pointsReward) throw new DomainError("MISSING_PARAMS", "title and pointsReward are required.", 400);
    const challenge = createChallenge({
      communityId, title: String(title), description: description ? String(description) : undefined,
      pointsReward: Number(pointsReward), type: (type ?? "custom") as ChallengeType,
      status: "active", verificationMethod: (verificationMethod ?? "manual") as VerificationMethod,
      maxCompletions: maxCompletions ? Number(maxCompletions) : undefined,
      expiresAt: expiresAt ? String(expiresAt) : undefined,
      partnerId: partnerId ? String(partnerId) : undefined,
    });
    return ok({ challenge }, {});
  } catch (e) { return handleApiError(e, "CREATE_CHALLENGE_ERROR"); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const body = await readJsonBody(req);
    const { id, ...updates } = body as Record<string, unknown>;
    if (!id) throw new DomainError("MISSING_ID", "Challenge id is required.", 400);
    const challenge = updateChallenge(String(id), updates as Parameters<typeof updateChallenge>[1]);
    if (challenge.communityId !== communityId) return fail("NOT_FOUND", "Challenge not found.", 404);
    return ok({ challenge });
  } catch (e) { return handleApiError(e, "UPDATE_CHALLENGE_ERROR"); }
}
