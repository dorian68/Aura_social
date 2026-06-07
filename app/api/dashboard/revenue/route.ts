import { ok } from "@/lib/apiResponse";
import { calculateRevenuePotential } from "@/lib/analytics/calculateRevenuePotential";
import { calculateProgramStats } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import { calculateTokenReadinessFromLoyalty } from "@/lib/loyalty/tokenEconomyEngine";
import {
  calculateB2BPlatformRevenue,
  calculateProviderBackedPlatformRevenue,
  getB2BAgentState,
} from "@/lib/b2b-agent/store";
import { getWorkspaceState } from "@/lib/workspace/store";
import type { CreatorNiche } from "@/lib/analytics/types";

export const runtime = "nodejs";

export async function GET() {
  const loyaltyState = getLoyaltyState();
  const programId = getDemoProgramId();
  const stats = calculateProgramStats(loyaltyState, programId);
  const readiness = calculateTokenReadinessFromLoyalty(stats);
  const b2b = getB2BAgentState();
  const workspace = getWorkspaceState();

  // ── Actual revenue (money already earned / in motion) ──────────────
  const fanPasses = loyaltyState.fanPasses.filter((p) => p.programId === programId);
  const fanPassActualRevenue = fanPasses.reduce(
    (sum, p) => sum + p.price * p.holders,
    0,
  );
  const b2bPlatformRevenue = calculateB2BPlatformRevenue(b2b.campaigns);
  const b2bProviderBackedRevenue = calculateProviderBackedPlatformRevenue(b2b.campaigns);
  const actualMonthlyRevenue = fanPassActualRevenue + b2bPlatformRevenue;

  // ── Followers estimate ───────────────────────────────────────────────
  // Use Instagram connected account follower hint if available,
  // otherwise derive from loyalty active fan base (fans ≈ 5-10% of audience)
  const instagramAccount = workspace.connectedAccounts.find(
    (a) => a.provider === "instagram" && a.status !== "disabled",
  );
  const followersEstimate = instagramAccount
    ? stats.activeFans * 18   // proxy: loyalty fans ≈ 5.5% of audience
    : Math.max(stats.activeFans * 15, 1_000);

  // ── Engagement rate from loyalty data ───────────────────────────────
  const totalFans = Object.values(stats.tierCounts).reduce((s, n) => s + n, 0);
  const rawEngagementRate = totalFans > 0
    ? Math.min(15, Math.max(2, (stats.activeFans / totalFans) * 100))
    : 5;

  // ── Niche — read from workspace metadata or default ─────────────────
  const niche: CreatorNiche = "Lifestyle"; // TODO: let creator set this via onboarding

  // ── Revenue potential via official engine ───────────────────────────
  const potential = calculateRevenuePotential(
    {
      username: "creator",
      followers: Math.round(followersEstimate),
      postsAnalyzed: 0,
      averageLikes: 0,
      averageComments: 0,
      niche,
      goal: "vendre une communauté privée",
      posts: [],
    },
    rawEngagementRate,
    readiness.score,
  );

  // ── Revenue series (12 months ramp toward realistic monthly) ────────
  const targetMonthly = Math.max(
    actualMonthlyRevenue,
    potential.realistic.monthlyRevenue,
  );
  const series = Array.from({ length: 12 }, (_, i) => {
    const progress = (i + 1) / 12;
    const eased = 1 - Math.pow(1 - progress, 2);
    return Math.round(targetMonthly * eased * (0.5 + progress * 0.5) * 10) / 10;
  });

  return ok({
    actual: {
      monthlyRevenue: Math.round(actualMonthlyRevenue),
      fanPassRevenue: Math.round(fanPassActualRevenue),
      b2bRevenue: Math.round(b2bPlatformRevenue),
      b2bRevenueSource: "campaign_commissions",
      b2bProviderBackedRevenue: Math.round(b2bProviderBackedRevenue),
      b2bProviderBackedRevenueSource: "stripe_paid_campaign_commissions",
      currency: "EUR",
    },
    potential: {
      conservative: potential.conservative,
      realistic: potential.realistic,
      ambitious: potential.ambitious,
    },
    inputs: {
      followersEstimate: Math.round(followersEstimate),
      engagementRate: Math.round(rawEngagementRate * 10) / 10,
      tokenReadinessScore: readiness.score,
      niche,
    },
    series,
    displayMonthly: actualMonthlyRevenue > 0
      ? Math.round(actualMonthlyRevenue)
      : potential.realistic.monthlyRevenue,
  });
}
