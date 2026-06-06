import type { CreatorAnalysisInput, RevenuePotential, RevenueScenario } from "@/lib/analytics/types";
import { round } from "@/lib/analytics/formatters";

const annualArpuByNiche = {
  Fitness: 80,
  Beauty: 70,
  Finance: 150,
  Food: 50,
  Lifestyle: 60,
  Gaming: 45,
  Education: 120,
  Music: 40,
  Other: 50,
} as const;

function getConversionRate(tokenReadinessScore: number) {
  if (tokenReadinessScore < 30) return 0.02;
  if (tokenReadinessScore < 50) return 0.05;
  if (tokenReadinessScore < 70) return 0.08;
  if (tokenReadinessScore < 85) return 0.12;
  return 0.18;
}

function createScenario(
  label: RevenueScenario["label"],
  followers: number,
  engagementRate: number,
  conversionRate: number,
  arpu: number,
): RevenueScenario {
  const vipFans = round(followers * (engagementRate / 100) * conversionRate);
  const annualRevenue = round(vipFans * arpu);
  return {
    label,
    conversionRate: round(conversionRate * 100, 2),
    vipFans,
    arpu: round(arpu),
    annualRevenue,
    monthlyRevenue: round(annualRevenue / 12),
  };
}

export function calculateRevenuePotential(
  input: CreatorAnalysisInput,
  engagementRate: number,
  tokenReadinessScore: number,
): RevenuePotential {
  const conversionRate = getConversionRate(tokenReadinessScore);
  const arpu = annualArpuByNiche[input.niche];
  return {
    conservative: createScenario("Prudent", input.followers, engagementRate, conversionRate * 0.5, arpu * 0.8),
    realistic: createScenario("Réaliste", input.followers, engagementRate, conversionRate, arpu),
    ambitious: createScenario("Ambitieux", input.followers, engagementRate, conversionRate * 1.5, arpu * 1.2),
  };
}
