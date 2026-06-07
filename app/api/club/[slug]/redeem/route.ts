import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import {
  getCommunityBySlug, getFanByEmail, getMembership, redeemReward,
} from "@/lib/superfan/db";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await readJsonBody(req);
    const { email, rewardId } = body as Record<string, string>;

    if (!email || !email.includes("@")) throw new DomainError("INVALID_EMAIL", "A valid email is required.", 400);
    if (!rewardId) throw new DomainError("MISSING_REWARD", "rewardId is required.", 400);

    const community = getCommunityBySlug(slug);
    if (!community) throw new DomainError("CLUB_NOT_FOUND", "Club not found.", 404);

    const fan = getFanByEmail(email);
    if (!fan) throw new DomainError("FAN_NOT_FOUND", "No fan found with this email. Join the club first.", 404);

    const membership = getMembership(community.id, fan.id);
    if (!membership) throw new DomainError("NOT_A_MEMBER", "You must join this club first.", 403);

    const redemption = redeemReward(rewardId, fan.id, community.id);
    return ok({
      redemption: {
        id: redemption.id,
        status: redemption.status,
        pointsSpent: redemption.pointsSpent,
      },
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.startsWith("INSUFFICIENT_POINTS:")) {
        const parts = e.message.split(":");
        return fail("INSUFFICIENT_POINTS", `Not enough points. You have ${parts[1]}, need ${parts[2]}.`, 400);
      }
      if (e.message === "REWARD_OUT_OF_STOCK") return fail("REWARD_OUT_OF_STOCK", "This reward is out of stock.", 400);
      if (e.message === "REWARD_UNAVAILABLE") return fail("REWARD_UNAVAILABLE", "This reward is no longer available.", 400);
      if (e.message === "REWARD_NOT_FOUND") return fail("REWARD_NOT_FOUND", "Reward not found.", 404);
    }
    return handleApiError(e, "REDEEM_ERROR");
  }
}
