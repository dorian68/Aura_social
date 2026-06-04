import { createFanPass, simulatePassLaunch } from "@/lib/loyalty/fanPassEngine";
import { getDemoProgramId, getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { recordAuditEvent } from "@/lib/workspace/store";
import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

registerTool({
  name: "listFanPasses",
  description: "Lists all fan passes in the loyalty program.",
  category: "fan_pass",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Fan passes list", uiBlock: "fan_pass" },
  auditAction: "operator.fanpass.list",
  async execute(_input, _context): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const passes = state.fanPasses.filter((p) => p.programId === programId);

    return {
      success: true,
      simulated: false,
      data: { passes, count: passes.length },
      uiBlocks: passes.slice(0, 4).map((p) => ({
        type: "fan_pass" as const,
        title: p.name,
        data: {
          id: p.id,
          name: p.name,
          tier: p.tier,
          price: p.price,
          currency: p.currency,
          supply: p.supply,
          holders: p.holders,
          benefits: p.benefits,
          status: p.status,
        },
      })),
      nextActions: ["createFanPass", "simulateFanPassLaunch"],
    };
  },
});

registerTool({
  name: "createFanPass",
  description: "Creates a new fan pass tier (draft, not yet published).",
  category: "fan_pass",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Pass name (e.g. Gold Fan Pass)" },
      tier: {
        type: "string",
        description: "Pass tier level",
        enum: ["bronze", "silver", "gold", "vip", "inner_circle", "event"],
      },
      price: { type: "number", description: "Price in EUR" },
      supply: { type: "number", description: "Maximum number of passes available" },
      benefits: { type: "array", description: "List of benefits", items: { type: "string" } },
    },
    required: ["name", "tier", "price", "supply"],
  },
  outputSchema: { description: "Created fan pass", uiBlock: "fan_pass" },
  auditAction: "operator.fanpass.create",
  async execute(input: Record<string, unknown>, context): Promise<ToolResult> {
    const name = String(input.name || "");
    const tier = String(input.tier || "gold");
    const price = Number(input.price) || 0;
    const supply = Number(input.supply) || 100;
    const benefits = Array.isArray(input.benefits) ? (input.benefits as string[]) : [`${tier} access`, "Early content", "Exclusive events"];
    const state = getLoyaltyState();
    const programId = getDemoProgramId();

    const { pass, state: nextState } = createFanPass(state, {
      programId,
      name,
      tier: tier as never,
      price,
      supply,
      benefits,
    });
    setLoyaltyState(nextState);

    recordAuditEvent({
      workspaceId: context.workspaceId || "workspace_aura_demo",
      actorType: "agent",
      action: "operator.fanpass.create",
      targetType: "fan_pass",
      targetId: pass.id,
      severity: "info",
      message: `Fan pass "${pass.name}" (${pass.tier}) created via Operator at €${pass.price}.`,
      metadata: { passId: pass.id, tier: pass.tier, price: pass.price, supply: pass.supply },
    });

    return {
      success: true,
      simulated: false,
      data: { pass },
      uiBlocks: [
        {
          type: "fan_pass",
          title: "Fan Pass Created",
          data: {
            id: pass.id,
            name: pass.name,
            tier: pass.tier,
            price: pass.price,
            currency: pass.currency,
            supply: pass.supply,
            holders: pass.holders,
            benefits: pass.benefits,
            status: pass.status,
          },
        },
      ],
      nextActions: ["simulateFanPassLaunch", "listFanPasses"],
    };
  },
});

registerTool({
  name: "simulateFanPassLaunch",
  description: "Simulates the launch of a fan pass to project revenue and uptake.",
  category: "fan_pass",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      passId: { type: "string", description: "Pass ID to simulate (uses first pass if omitted)" },
      followerCount: { type: "number", description: "Estimated audience size", default: 10000 },
      engagementRate: { type: "number", description: "Strong engagement rate (%)", default: 5 },
      conversionRate: { type: "number", description: "Expected conversion rate (%)", default: 2 },
    },
  },
  outputSchema: { description: "Fan pass launch simulation", uiBlock: "fan_pass" },
  auditAction: "operator.fanpass.simulate",
  async execute(
    input: { passId?: string; followerCount?: number; engagementRate?: number; conversionRate?: number },
    _context,
  ): Promise<ToolResult> {
    const state = getLoyaltyState();
    const programId = getDemoProgramId();
    const passes = state.fanPasses.filter((p) => p.programId === programId);
    const pass = (input.passId ? passes.find((p) => p.id === input.passId) : passes[0]) || passes[0];

    if (!pass) {
      return {
        success: false,
        error: "No fan pass found. Create one first.",
        simulated: true,
        uiBlocks: [],
        nextActions: ["createFanPass"],
      };
    }

    const sim = simulatePassLaunch({
      followerCount: input.followerCount || 10000,
      strongEngagementRate: input.engagementRate || 5,
      expectedConversionRate: input.conversionRate || 2,
      passPrice: pass.price,
      supply: pass.supply,
    });

    return {
      success: true,
      simulated: true,
      data: { pass, simulation: sim },
      uiBlocks: [
        {
          type: "fan_pass",
          title: `[SIMULATION] ${pass.name} Launch`,
          data: {
            name: pass.name,
            tier: pass.tier,
            price: pass.price,
            currency: pass.currency,
            supply: pass.supply,
            estimatedHolders: sim.estimatedPassHolders,
            estimatedRevenue: sim.estimatedRevenue,
            priceRecommendation: sim.priceRecommendation,
            supplyRecommendation: sim.supplyRecommendation,
            conversionRate: `${sim.expectedConversionRate}%`,
            simulated: true,
          },
        },
        {
          type: "kpi",
          title: "Launch Projections",
          data: {
            metrics: [
              { label: "Expected Holders", value: String(sim.estimatedPassHolders) },
              { label: "Estimated Revenue", value: `€${sim.estimatedRevenue.toFixed(2)}` },
              { label: "Conversion Rate", value: `${sim.expectedConversionRate}%` },
              { label: "Supply Remaining", value: String(sim.supplyRemaining) },
            ],
          },
        },
      ],
      nextActions: ["createFanPass", "listFanPasses"],
    };
  },
});
