import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { buildPrivateAnalytics } from "@/lib/meta/privateAnalytics";
import { createMetaClient } from "@/lib/meta/metaClient";
import { fetchPrivateMediaWithInsights } from "@/lib/meta/insightService";
import { resolvePrivateAccess } from "@/lib/meta/tokenStore";
import { calculateRevenuePotential } from "@/lib/analytics/calculateRevenuePotential";
import { calculateProgramStats } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import { calculateTokenReadinessFromLoyalty } from "@/lib/loyalty/tokenEconomyEngine";
import { MetaAppError } from "@/lib/meta/utils";
import { creatorNiches, type CreatorNiche } from "@/lib/analytics/types";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const connectionId = request.nextUrl.searchParams.get("connectionId") || "";
    const igUserId     = request.nextUrl.searchParams.get("igUserId")     || "";

    if (!connectionId || !igUserId) {
      return fail("MISSING_PARAMS", "connectionId and igUserId are required.", 400);
    }

    // ── Resolve access ───────────────────────────────────────────────
    let access;
    try {
      access = resolvePrivateAccess({ connectionId, igUserId });
    } catch (e) {
      if (e instanceof MetaAppError) return fail(e.code, e.message, e.status as number);
      throw e;
    }

    // ── Fetch Instagram Graph API data ───────────────────────────────
    const metaClient = createMetaClient();
    const payload    = await fetchPrivateMediaWithInsights(
      metaClient, igUserId, access.accessToken, access.authProvider,
    );
    const analytics = buildPrivateAnalytics(payload);

    const followers     = Number(analytics.profile.followers_count || 0);
    const engagementRate = analytics.overview.average_engagement_rate || 0;
    const username      = String(analytics.profile.username || "");

    // ── Real per-post averages from the Graph API media (no longer hardcoded 0) ──
    const mediaList = analytics.media || [];
    const avg = (sel: (m: (typeof mediaList)[number]) => number) =>
      mediaList.length ? Math.round(mediaList.reduce((s, m) => s + (Number(sel(m)) || 0), 0) / mediaList.length) : 0;
    const averageLikes    = avg((m) => m.like_count);
    const averageComments = avg((m) => m.comments_count);

    // ── Niche drives ARPU in the revenue model — configurable via ?niche=, validated ──
    const nicheParam = request.nextUrl.searchParams.get("niche") || "";
    const niche: CreatorNiche = (creatorNiches as readonly string[]).includes(nicheParam)
      ? (nicheParam as CreatorNiche)
      : "Lifestyle";

    // ── Feed real signals into revenue engine ──────────────────────
    const loyaltyState    = getLoyaltyState();
    const programId       = getDemoProgramId();
    const loyaltyStats    = calculateProgramStats(loyaltyState, programId);
    const readiness       = calculateTokenReadinessFromLoyalty(loyaltyStats);

    const revenue = followers > 0
      ? calculateRevenuePotential(
          { username, followers, postsAnalyzed: mediaList.length,
            averageLikes, averageComments, niche, goal: "vendre une communauté privée", posts: [] },
          engagementRate,
          readiness.score,
        )
      : null;

    // ── Top posts summary ────────────────────────────────────────────
    const topPosts = analytics.media
      .sort((a, b) => (b.reach || 0) - (a.reach || 0))
      .slice(0, 6)
      .map((p) => ({
        id:             p.id,
        mediaType:      p.media_type,
        permalink:      p.permalink,
        thumbnailUrl:   p.thumbnail_url || p.media_url || null,
        reach:          p.reach,
        likes:          p.like_count,
        comments:       p.comments_count,
        saves:          p.saves,
        engagementRate: p.engagement_rate,
        saveRate:       p.save_rate,
      }));

    return ok({
      connected: true,
      mock: Boolean(metaClient.mock),
      profile: {
        igUserId,
        username,
        name:             String(analytics.profile.name || ""),
        followersCount:   followers,
        mediaCount:       Number(analytics.profile.media_count || 0),
        profilePictureUrl: String(analytics.profile.profile_picture_url || ""),
      },
      overview: analytics.overview,
      engagement: { averageLikes, averageComments, postsAnalyzed: mediaList.length },
      niche,
      topPosts,
      revenue,
      readinessScore: readiness.score,
      warnings: analytics.warnings,
    });
  } catch (err) {
    return handleApiError(err, "INSTAGRAM_STATS_ERROR");
  }
}
