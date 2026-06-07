import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { createMetaClient } from "@/lib/meta/metaClient";
import { fetchPrivateMediaWithInsights } from "@/lib/meta/insightService";
import { buildPrivateAnalytics } from "@/lib/meta/privateAnalytics";
import { resolvePrivateAccess } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import { DEFAULT_RULE_POINTS } from "@/lib/loyalty/loyaltyRules";
import { getLoyaltyState } from "@/lib/loyalty/store";
import type { LoyaltyActionType } from "@/lib/loyalty/types";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Lot 4.3 — Honest Instagram → loyalty bridge.
 *
 * Reads the connected creator's REAL Instagram engagement and maps it to what it
 * would be worth under the creator's loyalty point rules.
 *
 * HONESTY CONSTRAINT (documented in the response): the Instagram Graph API only
 * exposes AGGREGATE, account-level signals (per-post like_count / comments_count
 * and the impressions/reach/saved insights). It does NOT expose the identity of
 * individual likers or commenters. We therefore cannot attribute engagement to
 * individual fans and we never invent fans or award per-fan points from this
 * data. This endpoint is read-only: it surfaces the real aggregate engagement and
 * the point-potential it represents, clearly labelled as aggregate/illustrative.
 */
export async function GET(request: NextRequest) {
  try {
    const igUserId = request.nextUrl.searchParams.get("igUserId")?.trim() || "";
    if (!igUserId) {
      return fail("MISSING_IG_USER_ID", "Select a connected Instagram account first.", 400);
    }

    let access;
    try {
      access = resolvePrivateAccess({
        connectionId: request.nextUrl.searchParams.get("connectionId") || "",
        igUserId,
        accessToken: request.nextUrl.searchParams.get("accessToken") || "",
        authProvider: request.nextUrl.searchParams.get("authProvider") || "",
      });
    } catch (e) {
      if (e instanceof MetaAppError) return fail(e.code, e.message, e.status as number);
      throw e;
    }

    // Fetch the REAL Instagram signals (aggregate only) and reuse the existing
    // analytics aggregator so totals stay consistent with the analyzer page.
    const metaClient = createMetaClient();
    const payload = await fetchPrivateMediaWithInsights(metaClient, igUserId, access.accessToken, access.authProvider);
    const analytics = buildPrivateAnalytics(payload);

    // Resolve the creator's REAL loyalty program rules (if they launched one) so
    // the point values reflect their configured rules, not a generic default.
    const creatorId = `creator_ig_${igUserId}`;
    const state = getLoyaltyState();
    const creator = state.creators.find((c) => c.id === creatorId) || null;
    const program = creator?.loyaltyProgramId
      ? state.programs.find((p) => p.id === creator.loyaltyProgramId) || null
      : null;
    const programRules = program ? state.rules.filter((r) => r.programId === program.id && r.active) : [];

    const pointsFor = (action: LoyaltyActionType) =>
      programRules.find((r) => r.actionType === action)?.points ?? DEFAULT_RULE_POINTS[action] ?? 0;

    // Aggregate the real signals across the recent media window.
    const totalLikes = analytics.media.reduce((sum, post) => sum + (post.like_count || 0), 0);
    const totalComments = analytics.media.reduce((sum, post) => sum + (post.comments_count || 0), 0);
    const totalSaves = analytics.overview.total_saves || 0;

    const signals = {
      window: "last_media",
      mediaCount: analytics.media.length,
      followers: analytics.profile.followers_count,
      totalLikes,
      totalComments,
      totalSaves,
      totalReach: analytics.overview.total_reach,
      totalImpressions: analytics.overview.total_impressions,
      averageEngagementRate: analytics.overview.average_engagement_rate,
    };

    // Map each aggregate signal to the point value its action carries. This is an
    // engagement-VALUE projection, NOT awarded points — see attribution below.
    const breakdown = [
      { actionType: "like" as const, count: totalLikes, pointsPerUnit: pointsFor("like") },
      { actionType: "comment" as const, count: totalComments, pointsPerUnit: pointsFor("comment") },
      { actionType: "save" as const, count: totalSaves, pointsPerUnit: pointsFor("save") },
    ].map((row) => ({ ...row, points: Math.round(row.count * row.pointsPerUnit) }));

    const engagementPointPotential = breakdown.reduce((sum, row) => sum + row.points, 0);

    return ok(
      {
        connected: Boolean(program),
        creatorId,
        program: program
          ? { id: program.id, name: program.name, pointsName: program.pointsName }
          : null,
        profile: {
          username: analytics.profile.username,
          name: analytics.profile.name,
          followers: analytics.profile.followers_count,
        },
        signals,
        pointsMapping: {
          attribution: "aggregate",
          engagementPointPotential,
          pointsName: program?.pointsName || "points",
          breakdown,
          basis: program ? "program_rules" : "default_rules",
        },
        topPosts: analytics.best_posts,
        warnings: analytics.warnings,
        limitations: [
          "Instagram's Graph API only exposes aggregate, account-level signals (per-post likes, comments, impressions, reach, saves).",
          "It does NOT expose which individual fan liked, commented or saved — so engagement cannot be attributed to individual fans.",
          "These point values are an illustrative projection of community engagement, not points awarded to any fan.",
          "To award real per-fan points, use an explicit fan action (purchase, event check-in, referral, verified code) via /api/loyalty/award — those have a known fan identity.",
        ],
      },
      {
        mockMeta: metaClient.mock,
        attribution: "aggregate",
        programLaunched: Boolean(program),
      },
    );
  } catch (e) {
    if (e instanceof MetaAppError) return fail(e.code, e.message, e.status as number);
    return handleApiError(e, "INSTAGRAM_SIGNALS_FAILED");
  }
}
