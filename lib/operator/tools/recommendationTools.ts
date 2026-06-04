import { generateCampaignDraft, generateDmDraft, runAgentOrchestrator } from "@/lib/agent/agentOrchestrator";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

registerTool({
  name: "generateRecommendations",
  description: "Generates AI-powered recommendations for loyalty program optimization.",
  category: "recommendations",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Agent recommendations list", uiBlock: "action_plan" },
  auditAction: "operator.recommendations.generate",
  async execute(_input, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const result = runAgentOrchestrator(state, programId);

    const highPriority = result.recommendations.filter((r) => r.priority === "high" || r.priority === "urgent");

    return {
      success: true,
      simulated: false,
      data: { recommendations: result.recommendations, mode: result.mode },
      uiBlocks: [
        {
          type: "action_plan",
          title: "Agent Recommendations",
          data: {
            mode: result.mode,
            count: result.recommendations.length,
            items: result.recommendations.slice(0, 5).map((r) => ({
              id: r.id,
              title: r.title,
              priority: r.priority,
              type: r.type,
              message: r.message,
              suggestedAction: r.suggestedAction,
              expectedImpact: r.expectedImpact,
              confidence: r.confidence,
            })),
          },
        },
        ...(highPriority.length > 0
          ? [
              {
                type: "kpi" as const,
                title: "Priority Actions",
                data: {
                  metrics: highPriority.slice(0, 3).map((r) => ({
                    label: r.title,
                    value: r.priority.toUpperCase(),
                    trend: r.priority === "urgent" ? "up" : "stable",
                  })),
                },
              },
            ]
          : []),
      ],
      nextActions: ["generateCampaignDraft", "generateDMDraft", "getLoyaltyStats"],
    };
  },
});

registerTool({
  name: "generateCampaignDraft",
  description: "Generates a campaign draft with Instagram content for the loyalty program.",
  category: "recommendations",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Campaign type",
        enum: ["double_points", "fan_pass_launch", "reward_promotion", "engagement"],
        default: "double_points",
      },
    },
  },
  outputSchema: { description: "Campaign draft with content", uiBlock: "action_plan" },
  auditAction: "operator.recommendations.campaignDraft",
  async execute(_input: { type?: string }, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const result = generateCampaignDraft(state, programId);

    return {
      success: true,
      simulated: true,
      data: { campaign: result.campaign, drafts: result.drafts },
      uiBlocks: [
        {
          type: "action_plan",
          title: "[SIMULATION] Campaign Draft",
          data: {
            campaignName: result.campaign?.name || "Double Points Weekend",
            simulated: true,
            drafts: result.drafts.slice(0, 3).map((d) => ({
              channel: d.channel,
              audience: d.audience,
              messageSummary: d.message.slice(0, 150) + (d.message.length > 150 ? "..." : ""),
              cta: d.cta,
              approvalRequired: d.approvalRequired,
            })),
          },
        },
      ],
      nextActions: ["generateDMDraft", "generateRecommendations"],
    };
  },
});

registerTool({
  name: "generateDMDraft",
  description: "Generates personalized DM drafts for top fans.",
  category: "recommendations",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      fanCount: { type: "number", description: "Target top N fans", default: 20 },
    },
  },
  outputSchema: { description: "DM drafts for top fans", uiBlock: "action_plan" },
  auditAction: "operator.recommendations.dmDraft",
  async execute(input: { fanCount?: number }, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const drafts = generateDmDraft(state, programId);

    return {
      success: true,
      simulated: true,
      data: { drafts, count: drafts.length },
      uiBlocks: [
        {
          type: "action_plan",
          title: `[SIMULATION] DM Drafts (Top ${input.fanCount || 20} Fans)`,
          data: {
            simulated: true,
            approvalRequired: true,
            count: drafts.length,
            items: drafts.slice(0, 3).map((d) => ({
              channel: d.channel,
              audience: d.audience,
              messageSummary: d.message.slice(0, 120) + (d.message.length > 120 ? "..." : ""),
              cta: d.cta,
            })),
          },
        },
      ],
      nextActions: ["generateCampaignDraft", "getTopFans"],
    };
  },
});

registerTool({
  name: "explainRecommendation",
  description: "Explains a specific agent recommendation in detail.",
  category: "recommendations",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Recommendation type to explain",
        enum: ["campaign", "reward", "pricing", "dm", "fan_segment", "token_economy", "risk", "opportunity"],
      },
    },
  },
  outputSchema: { description: "Recommendation explanation", uiBlock: "action_plan" },
  auditAction: "operator.recommendations.explain",
  async execute(input: { type?: string }, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const result = runAgentOrchestrator(state, programId);
    const targetType = input.type;
    const rec = targetType
      ? result.recommendations.find((r) => r.type === targetType)
      : result.recommendations[0];

    if (!rec) {
      return {
        success: false,
        error: "No recommendation found for this type.",
        simulated: false,
        uiBlocks: [],
        nextActions: ["generateRecommendations"],
      };
    }

    return {
      success: true,
      simulated: false,
      data: { recommendation: rec },
      uiBlocks: [
        {
          type: "action_plan",
          title: rec.title,
          data: {
            type: rec.type,
            priority: rec.priority,
            message: rec.message,
            rationale: rec.rationale,
            suggestedAction: rec.suggestedAction,
            expectedImpact: rec.expectedImpact,
            confidence: `${Math.round(rec.confidence * 100)}%`,
          },
        },
      ],
      nextActions: ["generateCampaignDraft", "generateDMDraft"],
    };
  },
});
