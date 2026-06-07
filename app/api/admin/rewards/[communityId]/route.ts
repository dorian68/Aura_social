import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { getCommunityById, getRewardsForCommunity, createReward, updateReward } from "@/lib/superfan/db";
import type { RewardType, RewardStatus } from "@/lib/superfan/types";

export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    if (!getCommunityById(communityId)) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    return ok({ rewards: getRewardsForCommunity(communityId) });
  } catch (e) { return handleApiError(e, "REWARDS_ERROR"); }
}

export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    if (!getCommunityById(communityId)) return fail("COMMUNITY_NOT_FOUND", "Community not found.", 404);
    const body = await readJsonBody(req);
    const { title, description, imageUrl, pointsCost, type, stock, expiresAt, partnerId } = body as Record<string, unknown>;
    if (!title || !pointsCost) throw new DomainError("MISSING_PARAMS", "title and pointsCost are required.", 400);
    const reward = createReward({
      communityId, title: String(title), description: description ? String(description) : undefined,
      imageUrl: imageUrl ? String(imageUrl) : undefined, pointsCost: Number(pointsCost),
      type: (type ?? "digital") as RewardType, status: "active",
      stock: stock !== undefined ? Number(stock) : undefined,
      expiresAt: expiresAt ? String(expiresAt) : undefined,
      partnerId: partnerId ? String(partnerId) : undefined,
    });
    return ok({ reward });
  } catch (e) { return handleApiError(e, "CREATE_REWARD_ERROR"); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const body = await readJsonBody(req);
    const { id, ...updates } = body as Record<string, unknown>;
    if (!id) throw new DomainError("MISSING_ID", "Reward id is required.", 400);
    const reward = updateReward(String(id), updates as Parameters<typeof updateReward>[1]);
    if (reward.communityId !== communityId) return fail("NOT_FOUND", "Reward not found.", 404);
    return ok({ reward });
  } catch (e) { return handleApiError(e, "UPDATE_REWARD_ERROR"); }
}
