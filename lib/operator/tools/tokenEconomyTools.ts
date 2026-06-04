import { calculateProgramStats, getTopFans } from "@/lib/loyalty/loyaltyEngine";
import {
  calculateRedemptionPressure,
  calculateTokenReadinessFromLoyalty,
  createDefaultTokenEconomy,
  simulateAirdrop,
  simulateRewardsPool,
  validateTokenEconomyConfig,
} from "@/lib/loyalty/tokenEconomyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

registerTool({
  name: "getTokenEconomyState",
  description: "Returns the current token economy configuration and stats.",
  category: "token_economy",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Token economy state", uiBlock: "token_economy" },
  auditAction: "operator.token.getState",
  async execute(_input, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const economy = state.tokenEconomies.find((e) => e.programId === programId) || createDefaultTokenEconomy(programId);
    const stats = calculateProgramStats(state, programId);
    const readiness = calculateTokenReadinessFromLoyalty(stats);
    const pressure = calculateRedemptionPressure(stats);
    const validation = validateTokenEconomyConfig(economy);

    return {
      success: true,
      simulated: false,
      data: { economy, readiness, pressure, validation },
      uiBlocks: [
        {
          type: "token_economy",
          title: "Token Economy",
          data: {
            totalSupply: economy.totalSupply,
            tokenizationMode: economy.tokenizationMode,
            isTransferable: economy.isTransferable,
            isSpeculative: economy.isSpeculative,
            readinessScore: readiness.score,
            readinessLabel: readiness.label,
            redemptionPressure: pressure,
            warnings: validation.warnings,
            errors: validation.errors,
            pools: {
              communityRewards: economy.communityRewardsPool,
              launchAirdrop: economy.launchAirdropPool,
              creatorReserve: economy.creatorReserve,
              partnerRewards: economy.partnerRewardsPool,
              campaignBuffer: economy.campaignBufferPool,
            },
            disclaimer: economy.disclaimer,
          },
        },
      ],
      nextActions: ["simulateTokenEconomy", "analyzeTokenEconomyRisk", "explainTokenReadiness"],
    };
  },
});

registerTool({
  name: "simulateTokenEconomy",
  description: "Runs a full token economy simulation with airdrop and rewards pool projections.",
  category: "token_economy",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      totalSupply: { type: "number", description: "Total token supply (default 1,000,000)", default: 1000000 },
      topFanCount: { type: "number", description: "Number of top fans for airdrop", default: 50 },
      averageAirdrop: { type: "number", description: "Average tokens per top fan", default: 1000 },
      monthlyRewardBudget: { type: "number", description: "Monthly rewards pool spend", default: 5000 },
    },
  },
  outputSchema: { description: "Token economy simulation results", uiBlock: "token_economy" },
  auditAction: "operator.token.simulate",
  async execute(
    input: {
      totalSupply?: number;
      topFanCount?: number;
      averageAirdrop?: number;
      monthlyRewardBudget?: number;
    },
    _context,
  ): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const existingEconomy = state.tokenEconomies.find((e) => e.programId === programId);
    const economy = existingEconomy || createDefaultTokenEconomy(programId, input.totalSupply || 1_000_000);
    const topFans = getTopFans(state, programId, 50);

    const airdropSim = simulateAirdrop({
      economy,
      topFanCount: input.topFanCount || topFans.length || 50,
      averageAirdrop: input.averageAirdrop || 1000,
    });

    const rewardsSim = simulateRewardsPool({
      economy,
      monthlyRewardBudget: input.monthlyRewardBudget || 5000,
    });

    return {
      success: true,
      simulated: true,
      data: { economy, airdropSim, rewardsSim },
      uiBlocks: [
        {
          type: "token_economy",
          title: "[SIMULATION] Token Economy",
          data: {
            totalSupply: economy.totalSupply,
            tokenizationMode: economy.tokenizationMode,
            simulated: true,
            disclaimer: economy.disclaimer,
            airdrop: airdropSim,
            rewards: rewardsSim,
            pools: {
              communityRewards: economy.communityRewardsPool,
              launchAirdrop: economy.launchAirdropPool,
              creatorReserve: economy.creatorReserve,
            },
          },
        },
        {
          type: "kpi",
          title: "Simulation KPIs",
          data: {
            metrics: [
              { label: "Total Supply", value: economy.totalSupply.toLocaleString() },
              { label: "Airdrop Required", value: airdropSim.requiredTokens.toLocaleString() },
              { label: "Airdrop Viable", value: airdropSim.enoughPool ? "Yes" : "No" },
              { label: "Rewards Runway", value: `${rewardsSim.monthsCovered} months` },
            ],
          },
        },
      ],
      nextActions: ["analyzeTokenEconomyRisk", "explainTokenReadiness", "getTokenEconomyState"],
    };
  },
});

registerTool({
  name: "analyzeTokenEconomyRisk",
  description: "Analyzes risks in the current token economy configuration.",
  category: "token_economy",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Token economy risk analysis", uiBlock: "token_economy" },
  auditAction: "operator.token.analyzeRisk",
  async execute(_input, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const economy = state.tokenEconomies.find((e) => e.programId === programId) || createDefaultTokenEconomy(programId);
    const stats = calculateProgramStats(state, programId);
    const validation = validateTokenEconomyConfig(economy);
    const pressure = calculateRedemptionPressure(stats);

    const risks: string[] = [...validation.errors, ...validation.warnings];
    if (pressure > 70) risks.push(`High redemption pressure: ${pressure}%. Monitor closely.`);
    if (stats.outstandingLiability > 5000) risks.push(`Outstanding liability €${stats.outstandingLiability.toFixed(2)} may need review.`);

    return {
      success: true,
      simulated: false,
      data: { risks, validation, pressure, liability: stats.outstandingLiability },
      uiBlocks: [
        {
          type: "token_economy",
          title: "Token Economy Risk Analysis",
          data: {
            risks,
            warnings: validation.warnings,
            errors: validation.errors,
            redemptionPressure: pressure,
            estimatedLiability: stats.outstandingLiability,
            riskLevel: risks.length === 0 ? "low" : risks.length <= 2 ? "medium" : "high",
          },
        },
      ],
      nextActions: ["explainTokenReadiness", "simulateTokenEconomy"],
    };
  },
});

registerTool({
  name: "explainTokenReadiness",
  description: "Explains what Token Readiness means and shows the creator's current score.",
  category: "token_economy",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Token readiness explanation", uiBlock: "token_economy" },
  auditAction: "operator.token.explainReadiness",
  async execute(_input, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const stats = calculateProgramStats(state, programId);
    const readiness = calculateTokenReadinessFromLoyalty(stats);

    const explanation = [
      "Token Readiness measures whether your community is ready to benefit from a tokenized loyalty economy.",
      "",
      "It is scored 0–100 based on:",
      "• Active fans (up to 25 pts) — you need engaged community members",
      "• Superfans (up to 25 pts) — deeply engaged fans drive token demand",
      "• Inner Circle fans (up to 20 pts) — your highest-value tier",
      "• Points volume (up to 20 pts) — an active economy shows real utility",
      "• Redemption history (up to 10 pts) — proves fans value the rewards",
      "",
      "Higher scores = safer to consider on-chain features.",
      "Lower scores = stay off-chain, grow the community first.",
      "",
      "Token Readiness is NOT about investment or speculation.",
      "It is about community infrastructure for access and rewards.",
    ].join("\n");

    return {
      success: true,
      simulated: false,
      data: { readiness, stats, explanation },
      uiBlocks: [
        {
          type: "token_economy",
          title: "Token Readiness",
          data: {
            score: readiness.score,
            label: readiness.label,
            explanation,
            activeFans: stats.activeFans,
            superfans: stats.tierCounts.Superfan,
            innerCircle: stats.tierCounts["Inner Circle"],
            totalPointsIssued: stats.totalPointsIssued,
            rewardsRedeemed: stats.rewardsRedeemed,
          },
        },
      ],
      nextActions: ["simulateTokenEconomy", "analyzeTokenEconomyRisk", "getLoyaltyStats"],
    };
  },
});
