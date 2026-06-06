import { runAgentOrchestrator } from "@/lib/agent/agentOrchestrator";
import { getB2BAgentState } from "@/lib/b2b-agent/store";
import { getContractStatus, loadAbi } from "@/lib/blockchain/blockchainService";
import {
  calculateProgramStats,
  getProgramLedger,
  getTopFans,
  segmentFans,
} from "@/lib/loyalty/loyaltyEngine";
import { checkRewardEligibility } from "@/lib/loyalty/rewardEngine";
import { simulatePassLaunch } from "@/lib/loyalty/fanPassEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import {
  applyLoyaltyStatsToEconomy,
  calculateTokenReadinessFromLoyalty,
  createDefaultTokenEconomy,
  simulateAirdrop,
  simulateRewardsPool,
  validateTokenEconomyConfig,
} from "@/lib/loyalty/tokenEconomyEngine";
import { buildWorkspaceSnapshot } from "@/lib/workspace/status";

export function getAuraProductSnapshot() {
  const loyaltyState = getLoyaltyState();
  const programId = getDemoProgramId();
  const program = loyaltyState.programs.find((item) => item.id === programId) || loyaltyState.programs[0];
  const stats = calculateProgramStats(loyaltyState, program.id);
  const fans = loyaltyState.fans.filter((fan) => fan.programId === program.id);
  const topFans = getTopFans(loyaltyState, program.id, 8);
  const rewards = loyaltyState.rewards.filter((reward) => reward.programId === program.id);
  const fanPasses = loyaltyState.fanPasses.filter((pass) => pass.programId === program.id);
  const ledger = getProgramLedger(loyaltyState, program.id);
  const tokenEconomy = applyLoyaltyStatsToEconomy(
    loyaltyState.tokenEconomies.find((item) => item.programId === program.id) ||
      createDefaultTokenEconomy(program.id),
    stats,
  );
  const tokenReadiness = calculateTokenReadinessFromLoyalty(stats);
  const tokenValidation = validateTokenEconomyConfig(tokenEconomy);
  const airdropSimulation = simulateAirdrop({
    economy: tokenEconomy,
    topFanCount: Math.max(1, topFans.length),
    averageAirdrop: 200,
  });
  const rewardsPoolSimulation = simulateRewardsPool({
    economy: tokenEconomy,
    monthlyRewardBudget: 20_000,
  });
  const agentRun = runAgentOrchestrator(loyaltyState, program.id);
  const storedRecommendations = loyaltyState.recommendations.filter(
    (item) => item.programId === program.id,
  );
  const recommendations = storedRecommendations.length ? storedRecommendations : agentRun.recommendations;
  const b2bState = getB2BAgentState();
  const workspace = buildWorkspaceSnapshot();
  const integrations = workspace.integrations;
  const integrationSummary = {
    total: integrations.length,
    ready: integrations.filter((item) => item.status === "ready").length,
    mockReady: integrations.filter((item) => item.status === "mock_ready").length,
    missing: integrations.filter((item) => item.status === "missing_config").length,
    error: integrations.filter((item) => item.status === "error").length,
    safeMode: integrations.filter((item) => item.safeMode).length,
  };
  const integrationHealthScore = integrations.length
    ? Math.round(((integrationSummary.ready + integrationSummary.mockReady) / integrations.length) * 100)
    : 0;

  const fanPassRevenuePotential = fanPasses.reduce(
    (total, pass) => total + pass.price * Math.max(0, pass.supply - pass.holders),
    0,
  );
  const b2bRevenuePotential =
    b2bState.opportunities.reduce((total, opportunity) => total + opportunity.platformCommission, 0) ||
    60;

  const rewardEligibility = Object.fromEntries(
    rewards.map((reward) => {
      const fan = topFans[0] || fans[0];
      return [
        reward.id,
        fan ? checkRewardEligibility(loyaltyState, program.id, fan.id, reward.id) : null,
      ];
    }),
  );

  const fanPassSimulations = Object.fromEntries(
    fanPasses.map((pass) => [
      pass.id,
      simulatePassLaunch({
        followerCount: 50_000,
        strongEngagementRate: 2.5,
        expectedConversionRate: 0.5,
        passPrice: pass.price,
        supply: pass.supply,
      }),
    ]),
  );

  return {
    program,
    creator: loyaltyState.creators.find((item) => item.id === program.creatorId) || loyaltyState.creators[0],
    loyaltyState,
    stats,
    fans,
    topFans,
    ledger,
    rules: loyaltyState.rules.filter((rule) => rule.programId === program.id),
    rewards,
    rewardEligibility,
    fanPasses,
    fanPassSimulations,
    segments: segmentFans(loyaltyState, program.id),
    tokenEconomy,
    tokenReadiness,
    tokenValidation,
    airdropSimulation,
    rewardsPoolSimulation,
    blockchainStatus: getContractStatus(),
    abiStatus: {
      AuraLoyaltyPoints: loadAbi("AuraLoyaltyPoints").length,
      AuraFanPass: loadAbi("AuraFanPass").length,
      AuraRewardRegistry: loadAbi("AuraRewardRegistry").length,
    },
    recommendations,
    campaignDrafts: agentRun.drafts,
    b2bState,
    b2bRevenuePotential,
    workspace,
    integrationSummary,
    integrationHealthScore,
    fanPassRevenuePotential,
    superfanScore: calculateSuperfanScore(stats),
  };
}

export type AuraProductSnapshot = ReturnType<typeof getAuraProductSnapshot>;

function calculateSuperfanScore(stats: ReturnType<typeof calculateProgramStats>) {
  if (!stats.activeFans) return 0;
  const superfanWeight =
    (stats.tierCounts.Superfan * 8 + stats.tierCounts["Inner Circle"] * 14) / stats.activeFans;
  const activityWeight = Math.min(38, stats.totalPointsIssued / 500);
  const redemptionWeight = Math.min(18, stats.rewardsRedeemed * 2);
  return Math.round(Math.min(100, 28 + superfanWeight + activityWeight + redemptionWeight));
}
