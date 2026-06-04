import { calculateProgramStats, getTopFans } from "@/lib/loyalty/loyaltyEngine";
import { createReward } from "@/lib/loyalty/rewardEngine";
import { getDemoProgramId, getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { recordAuditEvent } from "@/lib/workspace/store";
import { registerTool } from "../toolRegistry";
import type { ToolResult, UIBlock } from "../types";

registerTool({
  name: "getLoyaltyStats",
  description: "Returns loyalty program statistics: fans, points issued, redemptions, tier distribution.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      programId: { type: "string", description: "Program ID (uses demo program if omitted)" },
    },
  },
  outputSchema: { description: "Loyalty program stats", uiBlock: "kpi" },
  auditAction: "operator.loyalty.getStats",
  async execute(input: { programId?: string }, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = input.programId || getDemoProgramId();
    const stats = calculateProgramStats(state, programId);
    const program = state.programs.find((p) => p.id === programId);

    return {
      success: true,
      simulated: false,
      data: { stats, program },
      uiBlocks: [
        {
          type: "kpi",
          title: "Loyalty Program Stats",
          data: {
            programName: program?.name || "Demo Program",
            pointsName: program?.pointsName || "Aura Points",
            metrics: [
              { label: "Active Fans", value: String(stats.activeFans) },
              { label: "Points Issued", value: stats.totalPointsIssued.toLocaleString() },
              { label: "Points Redeemed", value: stats.totalPointsRedeemed.toLocaleString() },
              { label: "Avg Fan Balance", value: String(Math.round(stats.averageFanBalance)) },
              { label: "Rewards Redeemed", value: String(stats.rewardsRedeemed) },
              { label: "Est. Liability €", value: `€${stats.outstandingLiability.toFixed(2)}` },
            ],
            tiers: stats.tierCounts,
          },
        },
      ],
      nextActions: ["getTopFans", "listRewards", "createReward", "getLoyaltyStats"],
    };
  },
});

registerTool({
  name: "getTopFans",
  description: "Returns the top fans by points balance and engagement.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Number of fans to return (default 10)", default: 10 },
    },
  },
  outputSchema: { description: "Top fans list", uiBlock: "kpi" },
  auditAction: "operator.loyalty.getTopFans",
  async execute(input: { limit?: number }, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const limit = input.limit || 10;
    const fans = getTopFans(state, programId, limit);

    return {
      success: true,
      simulated: false,
      data: { fans, count: fans.length },
      uiBlocks: [
        {
          type: "kpi",
          title: `Top ${fans.length} Fans`,
          data: {
            metrics: fans.slice(0, 5).map((f) => ({
              label: f.displayName || f.instagramHandle || `Fan ${f.id.slice(-4)}`,
              value: `${f.pointsBalance.toLocaleString()} pts`,
              trend: f.tier === "Inner Circle" || f.tier === "Superfan" ? "up" : "stable",
            })),
          },
        },
      ],
      nextActions: ["generateDMDraft", "generateCampaignDraft", "simulatePointsAward"],
    };
  },
});

registerTool({
  name: "listRewards",
  description: "Lists all rewards in the loyalty program.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Rewards list", uiBlock: "reward_card" },
  auditAction: "operator.loyalty.listRewards",
  async execute(_input, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const rewards = state.rewards.filter((r) => r.programId === programId);

    return {
      success: true,
      simulated: false,
      data: { rewards, count: rewards.length },
      uiBlocks: rewards.slice(0, 4).map((r) => ({
        type: "reward_card" as const,
        title: r.name,
        data: {
          id: r.id,
          name: r.name,
          description: r.description,
          costInPoints: r.costInPoints,
          rewardType: r.rewardType,
          stock: r.stock,
          redeemedCount: r.redeemedCount,
          status: r.status,
        },
      })),
      nextActions: ["createReward", "simulateRewardRedemption"],
    };
  },
});

registerTool({
  name: "createReward",
  description: "Creates a new reward in the loyalty program.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Reward name (e.g. VIP Dinner Access)" },
      costInPoints: { type: "number", description: "Cost in loyalty points" },
      rewardType: {
        type: "string",
        description: "Type of reward",
        enum: ["discount", "early_access", "exclusive_content", "event_access", "merch", "private_community", "badge", "custom"],
      },
      description: { type: "string", description: "Short description of the reward" },
      stock: { type: "number", description: "Limited stock (omit for unlimited)" },
    },
    required: ["name", "costInPoints"],
  },
  outputSchema: { description: "Created reward", uiBlock: "reward_card" },
  auditAction: "operator.loyalty.createReward",
  async execute(input: Record<string, unknown>, context): Promise<ToolResult> {
    const inp = input as { name: string; costInPoints: number; rewardType?: string; description?: string; stock?: number };
    const state = getLoyaltyState();
    const programId = getDemoProgramId();

    const { state: nextState, reward } = createReward(state, {
      programId,
      name: inp.name,
      costInPoints: inp.costInPoints,
      rewardType: (inp.rewardType as never) || "custom",
      description: inp.description,
      stock: inp.stock ?? null,
    });
    setLoyaltyState(nextState);

    recordAuditEvent({
      workspaceId: context.workspaceId || "workspace_aura_demo",
      actorType: "agent",
      action: "operator.loyalty.createReward",
      targetType: "reward",
      targetId: reward.id,
      severity: "info",
      message: `Reward "${reward.name}" created via Operator (${reward.costInPoints} pts).`,
      metadata: { rewardId: reward.id, costInPoints: reward.costInPoints, rewardType: reward.rewardType },
    });

    return {
      success: true,
      simulated: false,
      data: { reward },
      uiBlocks: [
        {
          type: "reward_card",
          title: "Reward Created",
          data: {
            id: reward.id,
            name: reward.name,
            description: reward.description,
            costInPoints: reward.costInPoints,
            rewardType: reward.rewardType,
            stock: reward.stock,
            status: reward.status,
          },
        },
      ],
      nextActions: ["listRewards", "simulateRewardRedemption"],
    };
  },
});

registerTool({
  name: "simulateRewardRedemption",
  description: "Simulates a fan redeeming a reward to see eligibility and impact.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      fanId: { type: "string", description: "Fan ID to simulate" },
      rewardId: { type: "string", description: "Reward ID to simulate redemption for" },
    },
  },
  outputSchema: { description: "Redemption simulation result", uiBlock: "kpi" },
  auditAction: "operator.loyalty.simulateRedemption",
  async execute(input: { fanId?: string; rewardId?: string }, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const fans = getTopFans(state, programId, 1);
    const fan = (input.fanId ? state.fans.find((f) => f.id === input.fanId) : fans[0]) || fans[0];
    const rewards = state.rewards.filter((r) => r.programId === programId && r.status === "active");
    const reward = (input.rewardId ? rewards.find((r) => r.id === input.rewardId) : rewards[0]) || rewards[0];

    if (!fan || !reward) {
      return {
        success: false,
        error: "Fan or reward not found for simulation.",
        simulated: true,
        uiBlocks: [],
        nextActions: ["getLoyaltyStats", "listRewards"],
      };
    }

    const eligible = fan.pointsBalance >= reward.costInPoints;
    return {
      success: true,
      simulated: true,
      data: {
        fan: { id: fan.id, displayName: fan.displayName, balance: fan.pointsBalance },
        reward: { id: reward.id, name: reward.name, cost: reward.costInPoints },
        eligible,
        balanceAfter: eligible ? fan.pointsBalance - reward.costInPoints : fan.pointsBalance,
        missingPoints: eligible ? 0 : reward.costInPoints - fan.pointsBalance,
      },
      uiBlocks: [
        {
          type: "kpi",
          title: "[SIMULATION] Reward Redemption",
          data: {
            metrics: [
              { label: "Fan", value: fan.displayName || fan.id },
              { label: "Reward", value: reward.name },
              { label: "Cost", value: `${reward.costInPoints} pts` },
              { label: "Fan Balance", value: `${fan.pointsBalance} pts` },
              { label: "Eligible", value: eligible ? "Yes" : "No" },
              { label: "Balance After", value: eligible ? `${fan.pointsBalance - reward.costInPoints} pts` : "N/A" },
            ],
          },
        },
      ],
      nextActions: ["getTopFans", "createReward"],
    };
  },
});

registerTool({
  name: "simulatePointsAward",
  description: "Simulates awarding points to the top fan to preview the impact.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      points: { type: "number", description: "Number of points to simulate awarding" },
    },
    required: ["points"],
  },
  outputSchema: { description: "Points award simulation", uiBlock: "kpi" },
  auditAction: "operator.loyalty.simulatePointsAward",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const points = Number(input.points) || 0;
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const fans = getTopFans(state, programId, 1);
    const fan = fans[0];

    if (!fan) {
      return {
        success: false,
        error: "No fans in program.",
        simulated: true,
        uiBlocks: [],
        nextActions: ["getLoyaltyStats"],
      };
    }

    const newBalance = fan.pointsBalance + points;
    return {
      success: true,
      simulated: true,
      data: { fan, pointsAwarded: points, balanceBefore: fan.pointsBalance, balanceAfter: newBalance },
      uiBlocks: [
        {
          type: "kpi",
          title: "[SIMULATION] Points Award",
          data: {
            metrics: [
              { label: "Fan", value: fan.displayName || fan.id },
              { label: "Points Awarded", value: String(points) },
              { label: "Balance Before", value: `${fan.pointsBalance} pts` },
              { label: "Balance After", value: `${newBalance} pts` },
            ],
          },
        },
      ],
      nextActions: ["getLoyaltyStats", "getTopFans"],
    };
  },
});

registerTool({
  name: "createPointsRule",
  description: "Creates a new points earning rule for a loyalty action type.",
  category: "loyalty",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      actionType: {
        type: "string",
        description: "Action that earns points",
        enum: ["like", "comment", "save", "share", "purchase", "event_attendance", "referral", "manual_bonus"],
      },
      points: { type: "number", description: "Points awarded per action" },
      description: { type: "string", description: "Rule description" },
    },
    required: ["actionType", "points"],
  },
  outputSchema: { description: "Created loyalty rule", uiBlock: "tool_result" },
  auditAction: "operator.loyalty.createPointsRule",
  async execute(input: Record<string, unknown>, context): Promise<ToolResult> {
    const actionType = String(input.actionType || "");
    const points = Number(input.points) || 1;
    const description = input.description ? String(input.description) : undefined;
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const rule = {
      id: `rule_op_${Date.now()}`,
      programId,
      actionType: actionType as never,
      points: Math.max(1, Math.round(points)),
      active: true,
      description: description || `${actionType} earns ${points} points`,
      source: "custom" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLoyaltyState({ ...state, rules: [...state.rules, rule] });

    recordAuditEvent({
      workspaceId: context.workspaceId || "workspace_aura_demo",
      actorType: "agent",
      action: "operator.loyalty.createPointsRule",
      targetType: "loyalty_rule",
      targetId: rule.id,
      severity: "info",
      message: `Points rule created: ${actionType} → ${points} pts`,
      metadata: { ruleId: rule.id, actionType, points },
    });

    return {
      success: true,
      simulated: false,
      data: { rule },
      uiBlocks: [
        {
          type: "tool_result",
          title: "Points Rule Created",
          data: {
            label: `${actionType} earns ${points} points`,
            fields: [
              { key: "Action", value: actionType },
              { key: "Points", value: String(points) },
              { key: "Status", value: "Active" },
            ],
          },
        },
      ],
      nextActions: ["getLoyaltyStats", "simulatePointsAward"],
    };
  },
});
