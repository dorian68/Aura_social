import { runAgentOrchestrator } from "../lib/agent/agentOrchestrator.ts";
import { createDemoLoyaltyState } from "../lib/loyalty/mockLoyaltyData.ts";

const state = createDemoLoyaltyState();
const programId = state.programs[0].id;
const result = runAgentOrchestrator(state, programId);

const output = {
  script: "debug-agent",
  success: true,
  mode: result.mode,
  recommendationCount: result.recommendations.length,
  recommendations: result.recommendations.map((recommendation) => ({
    type: recommendation.type,
    priority: recommendation.priority,
    title: recommendation.title,
    rationale: recommendation.rationale,
    suggestedAction: recommendation.suggestedAction,
    expectedImpact: recommendation.expectedImpact,
    confidence: recommendation.confidence,
    status: recommendation.status,
  })),
  drafts: result.drafts.map((draft) => ({
    channel: draft.channel,
    audience: draft.audience,
    message: draft.message,
    cta: draft.cta,
    approvalRequired: draft.approvalRequired,
  })),
};

console.log(JSON.stringify(output, null, 2));
