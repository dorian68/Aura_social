import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import {
  createSignalRule, getSignalRulesForCommunity, getCommunityById,
} from "@/lib/superfan/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("NOT_FOUND", "Community not found", 404);
    const rules = getSignalRulesForCommunity(communityId);
    return ok({ rules, total: rules.length });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const { communityId } = await params;
    const community = getCommunityById(communityId);
    if (!community) return fail("NOT_FOUND", "Community not found", 404);

    const body = await readJsonBody(req);
    const { platform, signalType, keywords, pointsReward, maxPerFan, maxPerDay, challengeId } = body as {
      platform: string;
      signalType: string;
      keywords?: string[];
      pointsReward?: number;
      maxPerFan?: number;
      maxPerDay?: number;
      challengeId?: string;
    };

    if (!platform || !signalType) return fail("MISSING_FIELDS", "platform and signalType are required", 400);

    const VALID_PLATFORMS = ["instagram", "tiktok", "youtube", "twitch", "discord"];
    const VALID_TYPES = ["post", "story", "video", "comment", "clip", "raid", "message"];
    if (!VALID_PLATFORMS.includes(platform)) return fail("INVALID_PLATFORM", `platform must be one of: ${VALID_PLATFORMS.join(", ")}`, 400);
    if (!VALID_TYPES.includes(signalType)) return fail("INVALID_SIGNAL_TYPE", `signalType must be one of: ${VALID_TYPES.join(", ")}`, 400);

    const rule = createSignalRule({
      communityId, challengeId, platform, signalType,
      keywords: Array.isArray(keywords) ? keywords : [],
      pointsReward: typeof pointsReward === "number" ? pointsReward : 100,
      maxPerFan: maxPerFan ?? undefined,
      maxPerDay: maxPerDay ?? undefined,
      isActive: true,
    });

    return ok({ rule });
  } catch (e) { return handleApiError(e); }
}
