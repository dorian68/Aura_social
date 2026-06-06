import { createDemoLoyaltyState } from "../lib/loyalty/mockLoyaltyData.ts";
import { calculateProgramStats } from "../lib/loyalty/loyaltyEngine.ts";
import {
  applyLoyaltyStatsToEconomy,
  calculateOutstandingLiability,
  calculateRedemptionPressure,
  calculateTokenReadinessFromLoyalty,
  createDefaultTokenEconomy,
  simulateAirdrop,
  simulateRewardsPool,
  validateTokenEconomyConfig,
} from "../lib/loyalty/tokenEconomyEngine.ts";

const state = createDemoLoyaltyState();
const programId = state.programs[0].id;
const stats = calculateProgramStats(state, programId);
const economy = applyLoyaltyStatsToEconomy(createDefaultTokenEconomy(programId), stats);

const output = {
  script: "debug-token-economy",
  success: true,
  disclaimer: economy.disclaimer,
  config: {
    tokenizationMode: economy.tokenizationMode,
    isTransferable: economy.isTransferable,
    isSpeculative: economy.isSpeculative,
    totalSupply: economy.totalSupply,
  },
  validation: validateTokenEconomyConfig(economy),
  airdrop: simulateAirdrop({
    economy,
    topFanCount: 50,
    averageAirdrop: 200,
  }),
  rewardsPool: simulateRewardsPool({
    economy,
    monthlyRewardBudget: 20_000,
  }),
  liability: calculateOutstandingLiability(
    stats.totalPointsIssued - stats.totalPointsRedeemed,
  ),
  redemptionPressure: calculateRedemptionPressure(stats),
  readiness: calculateTokenReadinessFromLoyalty(stats),
};

console.log(JSON.stringify(output, null, 2));
