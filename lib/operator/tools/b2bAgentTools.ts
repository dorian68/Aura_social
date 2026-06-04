import { discoverBusinesses, runB2BExpansionAgent, scoreDiscoveredBusinesses } from "@/lib/b2b-agent/orchestrator";
import { generateB2BPitch } from "@/lib/b2b-agent/pitchGenerator";
import { simulateSmePayment } from "@/lib/b2b-agent/paymentSimulator";
import { getB2BAgentState } from "@/lib/b2b-agent/store";
import { defaultB2BCategories } from "@/lib/b2b-agent/mockGooglePlacesProvider";
import { buildB2BContext, createOpportunityForBusiness } from "@/lib/b2b-agent/orchestrator";
import { recordAuditEvent } from "@/lib/workspace/store";
import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

registerTool({
  name: "runB2BExpansionAgent",
  description: "Runs the full B2B Expansion Agent to discover local business partnership opportunities.",
  category: "b2b_agent",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      location: { type: "string", description: "City/location to scan (e.g. Fort-de-France)", default: "Fort-de-France" },
      category: {
        type: "string",
        description: "Business category to target",
        enum: ["restaurant", "bar", "fashion", "beauty", "gym", "hotel", "tourism", "event_venue", "local_product", "concept_store", "culture"],
        default: "restaurant",
      },
      campaignBudget: { type: "number", description: "Simulated campaign budget in EUR", default: 200 },
    },
  },
  outputSchema: { description: "B2B agent run results with opportunities", uiBlock: "b2b_opportunity" },
  auditAction: "operator.b2b.runAgent",
  async execute(
    input: { location?: string; category?: string; campaignBudget?: number },
    context,
  ): Promise<ToolResult> {
    const location = input.location || "Fort-de-France";
    const categories = input.category ? [input.category as never] : defaultB2BCategories;
    const campaignBudget = input.campaignBudget || 200;

    const result = runB2BExpansionAgent({ location, categories, campaignBudget });

    recordAuditEvent({
      workspaceId: context.workspaceId || "workspace_aura_demo",
      actorType: "agent",
      action: "operator.b2b.runAgent",
      targetType: "b2b_run",
      targetId: result.run.id,
      severity: "info",
      message: `B2B Expansion Agent ran in ${location}: ${result.run.businessesDiscovered} businesses discovered, ${result.run.opportunitiesGenerated} opportunities.`,
      metadata: {
        location,
        businessesDiscovered: result.run.businessesDiscovered,
        opportunitiesGenerated: result.run.opportunitiesGenerated,
        revenuePotential: result.run.revenuePotential,
        simulated: true,
        externalCalls: 0,
      },
    });

    const bestBusiness = result.businesses[0];
    const bestScore = result.scores[0];

    return {
      success: true,
      simulated: true,
      data: {
        run: result.run,
        topBusiness: bestBusiness,
        topScore: bestScore,
        opportunity: result.bestOpportunity,
        campaignEconomics: result.campaignEconomics,
      },
      uiBlocks: [
        {
          type: "b2b_opportunity",
          title: `B2B Opportunities in ${location}`,
          data: {
            location,
            businessesDiscovered: result.run.businessesDiscovered,
            opportunitiesGenerated: result.run.opportunitiesGenerated,
            simulated: true,
            topBusiness: bestBusiness
              ? {
                  name: bestBusiness.name,
                  category: bestBusiness.category,
                  address: bestBusiness.address,
                  rating: bestBusiness.rating,
                  source: bestBusiness.source,
                }
              : null,
            bestScore: bestScore?.overallScore || 0,
            opportunity: result.bestOpportunity
              ? {
                  title: result.bestOpportunity.title,
                  proposedBudget: result.bestOpportunity.proposedBudget,
                  platformCommission: result.bestOpportunity.platformCommission,
                  estimatedReach: result.bestOpportunity.estimatedReach,
                }
              : null,
          },
        },
        {
          type: "kpi",
          title: "B2B Revenue Potential",
          data: {
            metrics: [
              { label: "Businesses Discovered", value: String(result.run.businessesDiscovered) },
              { label: "Opportunities", value: String(result.run.opportunitiesGenerated) },
              { label: "Best Score", value: `${bestScore?.overallScore || 0}/10` },
              { label: "Commission Potential", value: `€${result.run.revenuePotential.toFixed(2)}` },
              { label: "Fan Reward Budget", value: `€${result.campaignEconomics.fanRewardBudget.toFixed(2)}` },
            ],
          },
        },
        {
          type: "pitch_preview",
          title: "Outreach Pitch Draft",
          data: {
            subject: result.pitch.subject,
            message: result.pitch.message.slice(0, 300) + (result.pitch.message.length > 300 ? "..." : ""),
            tone: result.pitch.tone,
            approvalRequired: result.pitch.approvalRequired,
            channel: result.pitch.channel,
            simulated: true,
          },
        },
      ],
      nextActions: ["generatePartnershipPitch", "simulateSMEPayment", "discoverLocalBusinesses"],
    };
  },
});

registerTool({
  name: "discoverLocalBusinesses",
  description: "Discovers local businesses in a city using mock Google Places data.",
  category: "b2b_agent",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      location: { type: "string", description: "City to search in", default: "Fort-de-France" },
      category: {
        type: "string",
        description: "Business category filter",
        enum: ["restaurant", "bar", "fashion", "beauty", "gym", "hotel", "tourism", "event_venue", "local_product", "concept_store", "culture"],
      },
      limit: { type: "number", description: "Max businesses to return", default: 8 },
    },
  },
  outputSchema: { description: "Discovered businesses list", uiBlock: "b2b_opportunity" },
  auditAction: "operator.b2b.discover",
  async execute(input: { location?: string; category?: string; limit?: number }, _context): Promise<ToolResult> {
    const location = input.location || "Fort-de-France";
    const categories = input.category ? [input.category as never] : defaultB2BCategories;
    const businesses = discoverBusinesses({ location, categories, limit: input.limit || 8 });

    return {
      success: true,
      simulated: true,
      data: { businesses, count: businesses.length, location },
      uiBlocks: [
        {
          type: "b2b_opportunity",
          title: `Businesses in ${location}`,
          data: {
            location,
            simulated: true,
            count: businesses.length,
            businesses: businesses.slice(0, 5).map((b) => ({
              name: b.name,
              category: b.category,
              address: b.address,
              rating: b.rating,
              reviewCount: b.reviewCount,
              source: b.source,
            })),
          },
        },
      ],
      nextActions: ["scoreBusinessFit", "runB2BExpansionAgent"],
    };
  },
});

registerTool({
  name: "scoreBusinessFit",
  description: "Scores how well local businesses fit the creator's audience.",
  category: "b2b_agent",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      location: { type: "string", description: "Location used for scoring context", default: "Fort-de-France" },
    },
  },
  outputSchema: { description: "Business fit scores", uiBlock: "b2b_opportunity" },
  auditAction: "operator.b2b.scoreBusinessFit",
  async execute(input: { location?: string }, _context): Promise<ToolResult> {
    const location = input.location || "Fort-de-France";
    const businesses = discoverBusinesses({ location, limit: 5 });
    const scores = scoreDiscoveredBusinesses(businesses, location);

    return {
      success: true,
      simulated: true,
      data: { scores, count: scores.length },
      uiBlocks: [
        {
          type: "b2b_opportunity",
          title: "Business Fit Scores",
          data: {
            simulated: true,
            scores: scores.slice(0, 5).map((s) => ({
              businessId: s.businessId,
              overallScore: s.overallScore,
              audienceLocationFit: s.audienceLocationFit,
              categoryFit: s.categoryFit,
              rationale: s.rationale.slice(0, 2),
            })),
          },
        },
      ],
      nextActions: ["generatePartnershipPitch", "runB2BExpansionAgent"],
    };
  },
});

registerTool({
  name: "generatePartnershipPitch",
  description: "Generates a partnership outreach pitch for the best local business opportunity.",
  category: "b2b_agent",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      location: { type: "string", description: "Location of the business", default: "Fort-de-France" },
      budget: { type: "number", description: "Proposed campaign budget in EUR", default: 200 },
    },
  },
  outputSchema: { description: "Partnership pitch draft", uiBlock: "pitch_preview" },
  auditAction: "operator.b2b.generatePitch",
  async execute(input: { location?: string; budget?: number }, _context): Promise<ToolResult> {
    const location = input.location || "Fort-de-France";
    const businesses = discoverBusinesses({ location, limit: 3 });
    const scores = scoreDiscoveredBusinesses(businesses, location);
    const best = businesses[0];

    if (!best) {
      return {
        success: false,
        error: "No businesses found to pitch.",
        simulated: true,
        uiBlocks: [],
        nextActions: ["discoverLocalBusinesses"],
      };
    }

    const context = buildB2BContext();
    const opportunity = createOpportunityForBusiness(best, input.budget || 200, location);
    const pitch = generateB2BPitch({ business: best, opportunity, context });

    return {
      success: true,
      simulated: true,
      data: { pitch, business: best, opportunity },
      uiBlocks: [
        {
          type: "pitch_preview",
          title: "Partnership Pitch",
          data: {
            businessName: best.name,
            subject: pitch.subject,
            message: pitch.message,
            tone: pitch.tone,
            channel: pitch.channel,
            cta: pitch.callToAction,
            approvalRequired: pitch.approvalRequired,
            simulated: true,
          },
        },
      ],
      nextActions: ["simulateSMEPayment", "runB2BExpansionAgent"],
    };
  },
});

registerTool({
  name: "simulateSMEPayment",
  description: "Simulates a sponsored campaign payment from a local business (SME).",
  category: "b2b_agent",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      budget: { type: "number", description: "Campaign budget in EUR", default: 200 },
      location: { type: "string", description: "Business location", default: "Fort-de-France" },
    },
  },
  outputSchema: { description: "Payment simulation with revenue breakdown", uiBlock: "kpi" },
  auditAction: "operator.b2b.simulatePayment",
  async execute(input: { budget?: number; location?: string }, _context): Promise<ToolResult> {
    const budget = input.budget || 200;
    const location = input.location || "Fort-de-France";
    const businesses = discoverBusinesses({ location, limit: 1 });
    const best = businesses[0];

    if (!best) {
      return {
        success: false,
        error: "No business found for simulation.",
        simulated: true,
        uiBlocks: [],
        nextActions: ["discoverLocalBusinesses"],
      };
    }

    const context = buildB2BContext();
    const opportunity = createOpportunityForBusiness(best, budget, location);
    const { payment } = simulateSmePayment(opportunity, best, budget);

    return {
      success: true,
      simulated: true,
      data: { payment, business: best },
      uiBlocks: [
        {
          type: "kpi",
          title: "[SIMULATION] SME Campaign Payment",
          data: {
            simulated: true,
            metrics: [
              { label: "Campaign Budget", value: `€${payment.campaignBudget}` },
              { label: "Fan Reward Budget (70%)", value: `€${payment.fanRewardBudget.toFixed(2)}` },
              { label: "Aura Commission (30%)", value: `€${payment.platformCommission.toFixed(2)}` },
              { label: "Payment Status", value: payment.paymentStatus },
            ],
          },
        },
      ],
      nextActions: ["runB2BExpansionAgent", "generatePartnershipPitch"],
    };
  },
});
