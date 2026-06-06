import crypto from "node:crypto";
import { estimateFanPassOpportunity } from "./monetizationAgent";
import type { AgentContext } from "./types";
import type { AgentRecommendation, RecommendationPriority, RecommendationType } from "@/lib/loyalty/types";

export function generateRecommendations(context: AgentContext): AgentRecommendation[] {
  const recommendations: AgentRecommendation[] = [];
  const { program, stats, fanSegments, rewards, fanPasses, tokenEconomy } = context;
  const nearSuperfan = fanSegments.find((segment) => segment.name === "Near Superfan");
  const topPass = fanPasses.find((pass) => pass.tier === "vip") || fanPasses[0];
  const premiumReward = rewards
    .filter((reward) => reward.status === "active")
    .sort((a, b) => b.costInPoints - a.costInPoints)[0];

  if (nearSuperfan && nearSuperfan.fanCount > 0) {
    recommendations.push(
      buildRecommendation({
        programId: program.id,
        type: "campaign",
        priority: "high",
        title: "Launch a double-points challenge this weekend",
        message: `${nearSuperfan.fanCount} fans are close to the Superfan tier.`,
        rationale: "Near-superfans usually need a small engagement push, not a new product.",
        suggestedAction: "Give 2x points for comments and shares for 48 hours.",
        expectedImpact: `Estimated ${nearSuperfan.fanCount} fans can move closer to Superfan status.`,
        confidence: 0.82,
      }),
    );
  }

  if (topPass) {
    const opportunity = estimateFanPassOpportunity({
      stats,
      pass: topPass,
      followerCount: Math.max(5000, stats.activeFans * 250),
    });
    recommendations.push(
      buildRecommendation({
        programId: program.id,
        type: "pricing",
        priority: "medium",
        title: `Push ${topPass.name} to top fans`,
        message: opportunity.summary,
        rationale: "Your top fans already show access and community behavior.",
        suggestedAction: "Create an approved DM draft for the top fan segment before a public launch.",
        expectedImpact: opportunity.simulation.estimatedRevenue > 0
          ? `Estimated EUR ${opportunity.simulation.estimatedRevenue} launch revenue.`
          : "Use this as a demand test before scaling pass supply.",
        confidence: 0.74,
      }),
    );
  }

  if (premiumReward) {
    const affordableFans = context.state.fans.filter(
      (fan) => fan.programId === program.id && fan.pointsBalance >= premiumReward.costInPoints,
    );
    const affordableRate = stats.activeFans > 0 ? affordableFans.length / stats.activeFans : 0;
    if (affordableRate < 0.08) {
      recommendations.push(
        buildRecommendation({
          programId: program.id,
          type: "reward",
          priority: "medium",
          title: "Reduce premium reward friction",
          message: `Only ${Math.round(affordableRate * 100)}% of fans can afford ${premiumReward.name}.`,
          rationale: "A reward that is too expensive can reduce perceived momentum.",
          suggestedAction: `Test a lower cost around ${Math.max(250, Math.round(premiumReward.costInPoints * 0.75))} points or add a smaller version.`,
          expectedImpact: "Higher redemption velocity and clearer reward value.",
          confidence: 0.71,
        }),
      );
    }
  }

  if (tokenEconomy.isTransferable || tokenEconomy.isSpeculative) {
    recommendations.push(
      buildRecommendation({
        programId: program.id,
        type: "risk",
        priority: "urgent",
        title: "Keep tokenization non-speculative",
        message: "The MVP should keep points non-transferable and off-chain by default.",
        rationale: "Creators need loyalty and access infrastructure, not a trading product.",
        suggestedAction: "Disable transferability and keep mainnet deployment off.",
        expectedImpact: "Lower compliance risk and simpler fan onboarding.",
        confidence: 0.94,
      }),
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      buildRecommendation({
        programId: program.id,
        type: "opportunity",
        priority: "low",
        title: "Keep building loyalty activity",
        message: "The program is balanced. More fan activity will produce sharper recommendations.",
        rationale: "The agent needs redemption and pass purchase signals to find stronger monetization patterns.",
        suggestedAction: "Run a starter campaign and collect the next 7 days of loyalty events.",
        expectedImpact: "Better fan segmentation and more specific campaign targeting.",
        confidence: 0.62,
      }),
    );
  }

  return recommendations;
}

function buildRecommendation(input: {
  programId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  message: string;
  rationale: string;
  suggestedAction: string;
  expectedImpact: string;
  confidence: number;
}): AgentRecommendation {
  return {
    id: `rec_${crypto.randomUUID()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...input,
  };
}
