import type { LoyaltyProgramStats, TokenEconomy, TokenEconomyValidation } from "./types";

const DISCLAIMER =
  "This is a loyalty economy simulation, not an investment product. Points and fan passes are access and reward infrastructure.";

export function createDefaultTokenEconomy(programId: string, totalSupply = 1_000_000): TokenEconomy {
  return {
    programId,
    totalSupply,
    communityRewardsPool: totalSupply * 0.5,
    launchAirdropPool: totalSupply * 0.2,
    creatorReserve: totalSupply * 0.15,
    partnerRewardsPool: totalSupply * 0.1,
    campaignBufferPool: totalSupply * 0.05,
    isTransferable: false,
    isSpeculative: false,
    pointsToTokenRatio: 1,
    fanPassAllocation: totalSupply * 0.05,
    redemptionPressure: 0,
    estimatedLiability: 0,
    tokenizationMode: "offchain",
    disclaimer: DISCLAIMER,
  };
}

export function simulateAirdrop({
  economy,
  topFanCount,
  averageAirdrop,
}: {
  economy: TokenEconomy;
  topFanCount: number;
  averageAirdrop: number;
}) {
  const requiredTokens = Math.round(topFanCount * averageAirdrop);
  return {
    requiredTokens,
    poolSize: economy.launchAirdropPool,
    enoughPool: requiredTokens <= economy.launchAirdropPool,
    remainingPool: Math.max(0, economy.launchAirdropPool - requiredTokens),
    message:
      requiredTokens <= economy.launchAirdropPool
        ? "Launch airdrop fits inside the configured pool."
        : "Airdrop exceeds the launch pool. Reduce average allocation or target fewer fans.",
  };
}

export function simulateRewardsPool({
  economy,
  monthlyRewardBudget,
}: {
  economy: TokenEconomy;
  monthlyRewardBudget: number;
}) {
  const monthsCovered = monthlyRewardBudget > 0
    ? Math.floor(economy.communityRewardsPool / monthlyRewardBudget)
    : 0;

  return {
    monthlyRewardBudget,
    poolSize: economy.communityRewardsPool,
    monthsCovered,
    recommendation:
      monthsCovered < 6
        ? "Community rewards pool may drain too quickly. Lower monthly budget or increase reward pool allocation."
        : "Community rewards pool can support a useful loyalty runway.",
  };
}

export function calculateOutstandingLiability(pointsOutstanding: number, valuePerPoint = 0.01) {
  return roundCurrency(pointsOutstanding * valuePerPoint);
}

export function calculateRedemptionPressure(stats: LoyaltyProgramStats) {
  if (stats.totalPointsIssued === 0) return 0;
  return round((stats.totalPointsRedeemed / stats.totalPointsIssued) * 100, 2);
}

export function calculateTokenReadinessFromLoyalty(stats: LoyaltyProgramStats) {
  let score = 0;
  if (stats.activeFans >= 100) score += 25;
  else score += Math.min(25, stats.activeFans / 4);

  score += Math.min(25, stats.tierCounts.Superfan * 2);
  score += Math.min(20, stats.tierCounts["Inner Circle"] * 5);
  score += stats.totalPointsIssued > 20_000 ? 20 : Math.min(20, stats.totalPointsIssued / 1000);
  score += stats.rewardsRedeemed > 10 ? 10 : stats.rewardsRedeemed;

  return {
    score: Math.round(Math.min(100, score)),
    label:
      score >= 75
        ? "Ready for on-chain simulation"
        : score >= 45
          ? "Loyalty engine needs more activity first"
          : "Keep tokenization off-chain for now",
  };
}

export function validateTokenEconomyConfig(economy: TokenEconomy): TokenEconomyValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allocationTotal =
    economy.communityRewardsPool +
    economy.launchAirdropPool +
    economy.creatorReserve +
    economy.partnerRewardsPool +
    economy.campaignBufferPool;

  if (Math.round(allocationTotal) !== Math.round(economy.totalSupply)) {
    errors.push("Pool allocations must equal total supply.");
  }
  if (economy.isSpeculative) {
    errors.push("Aura MVP does not support speculative token configurations.");
  }
  if (economy.isTransferable) {
    warnings.push("Transfers are disabled by default. Enable only for a reviewed testnet use case.");
  }
  if (economy.creatorReserve > economy.totalSupply * 0.25) {
    warnings.push("Creator reserve is high. Consider allocating more to community rewards.");
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

export function applyLoyaltyStatsToEconomy(
  economy: TokenEconomy,
  stats: LoyaltyProgramStats,
): TokenEconomy {
  return {
    ...economy,
    redemptionPressure: calculateRedemptionPressure(stats),
    estimatedLiability: stats.outstandingLiability,
  };
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundCurrency(value: number) {
  return round(value, 2);
}
