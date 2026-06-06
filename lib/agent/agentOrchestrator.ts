import {
  generateDoublePointsCampaign,
  generateInstagramAnnouncement,
  generateStorySequence,
} from "./campaignAgent";
import { generateRewardReminderDM, generateTopFanDM, generateVIPPassLaunchDM } from "./dmAgent";
import { generateRecommendations } from "./recommendationEngine";
import type { AgentContext, AgentMode, AgentRunResult } from "./types";
import { calculateProgramStats, getTopFans, segmentFans } from "@/lib/loyalty/loyaltyEngine";
import type { CampaignDraft, LoyaltyState } from "@/lib/loyalty/types";

export function buildAgentContext(state: LoyaltyState, programId: string): AgentContext {
  const program = state.programs.find((item) => item.id === programId);
  if (!program) {
    throw new Error("Loyalty program was not found.");
  }

  return {
    program,
    stats: calculateProgramStats(state, programId),
    fanSegments: segmentFans(state, programId),
    rewards: state.rewards.filter((reward) => reward.programId === programId),
    fanPasses: state.fanPasses.filter((pass) => pass.programId === programId),
    tokenEconomy:
      state.tokenEconomies.find((economy) => economy.programId === programId) ||
      state.tokenEconomies[0],
    state,
  };
}

export function runAgentOrchestrator(
  state: LoyaltyState,
  programId: string,
  mode: AgentMode = process.env.AGENT_MODE === "llm" ? "llm" : "rules",
): AgentRunResult {
  const context = buildAgentContext(state, programId);
  const recommendations = generateRecommendations(context);
  const drafts = generateDefaultDrafts(context);

  return {
    // LLM mode is intentionally not implemented until credentials and review
    // controls exist. The deterministic engine remains the safe default.
    mode: mode === "llm" ? "rules" : mode,
    recommendations,
    drafts,
  };
}

export function generateCampaignDraft(state: LoyaltyState, programId: string) {
  const context = buildAgentContext(state, programId);
  return {
    campaign: generateDoublePointsCampaign(programId),
    drafts: [
      generateInstagramAnnouncement({
        programName: context.program.name,
        pointsName: context.program.pointsName,
      }),
      ...generateStorySequence(context.program.name),
    ],
  };
}

export function generateDmDraft(state: LoyaltyState, programId: string): CampaignDraft[] {
  const context = buildAgentContext(state, programId);
  return generateDefaultDrafts(context).filter((draft) => draft.channel === "instagram_dm");
}

function generateDefaultDrafts(context: AgentContext): CampaignDraft[] {
  const topFans = getTopFans(context.state, context.program.id, 1);
  const topFan = topFans[0];
  const vipPass = context.fanPasses.find((pass) => pass.tier === "vip") || context.fanPasses[0];
  const reward = context.rewards[0];
  const drafts: CampaignDraft[] = [
    generateInstagramAnnouncement({
      programName: context.program.name,
      pointsName: context.program.pointsName,
    }),
    ...generateStorySequence(context.program.name),
  ];

  if (topFan && vipPass) {
    drafts.push(
      generateTopFanDM({
        creatorName: context.program.name,
        fan: topFan,
        passName: vipPass.name,
      }),
      generateVIPPassLaunchDM(vipPass.name, vipPass.price),
    );
  }

  if (topFan && reward) {
    drafts.push(generateRewardReminderDM({ fan: topFan, reward }));
  }

  return drafts;
}
