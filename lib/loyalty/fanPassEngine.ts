import crypto from "node:crypto";
import type { FanPass, FanPassTier, LoyaltyState, PassLaunchSimulation } from "./types";

export interface CreateFanPassInput {
  programId: string;
  name: string;
  tier: FanPassTier;
  price: number;
  currency?: FanPass["currency"];
  supply: number;
  benefits: string[];
  status?: FanPass["status"];
}

export function createFanPass(
  state: LoyaltyState,
  input: CreateFanPassInput,
  now = new Date().toISOString(),
) {
  const pass: FanPass = {
    id: `pass_${randomId()}`,
    programId: input.programId,
    name: input.name.trim(),
    tier: input.tier,
    price: Math.max(0, Number(input.price)),
    currency: input.currency || "EUR",
    supply: Math.max(1, Math.round(input.supply)),
    holders: 0,
    benefits: input.benefits.filter(Boolean),
    status: input.status || "draft",
    createdAt: now,
    updatedAt: now,
  };

  return {
    pass,
    state: {
      ...state,
      fanPasses: [...state.fanPasses, pass],
    },
  };
}

export function calculatePassRevenue(pass: FanPass) {
  return roundCurrency(pass.price * pass.holders);
}

export function simulatePassLaunch({
  followerCount,
  strongEngagementRate,
  expectedConversionRate,
  passPrice,
  supply,
}: {
  followerCount: number;
  strongEngagementRate: number;
  expectedConversionRate: number;
  passPrice: number;
  supply: number;
}): PassLaunchSimulation {
  const engagedAudience = Math.round(followerCount * (strongEngagementRate / 100));
  const estimatedPassHolders = Math.min(
    Math.max(0, Math.round(engagedAudience * (expectedConversionRate / 100))),
    supply,
  );
  const estimatedRevenue = roundCurrency(estimatedPassHolders * passPrice);
  const supplyRemaining = Math.max(0, supply - estimatedPassHolders);

  return {
    expectedConversionRate,
    estimatedRevenue,
    estimatedPassHolders,
    supplyRemaining,
    priceRecommendation:
      estimatedPassHolders >= supply * 0.9
        ? "Demand pressure looks high. Raise price modestly or increase supply with clear capacity limits."
        : "Price looks viable for a first pass launch. Keep benefits specific and easy to understand.",
    supplyRecommendation:
      supplyRemaining > supply * 0.6
        ? "Supply may be too high for the first launch. Consider a smaller founder drop."
        : "Supply creates useful scarcity without forcing speculative behavior.",
  };
}

export function assignPassToFan(state: LoyaltyState, passId: string, fanId: string) {
  const pass = state.fanPasses.find((item) => item.id === passId);
  const fan = state.fans.find((item) => item.id === fanId);
  if (!pass || !fan) {
    throw new Error("Fan pass or fan was not found.");
  }
  if (pass.status !== "active") {
    throw new Error("Fan pass is not active.");
  }
  if (pass.holders >= pass.supply) {
    throw new Error("Fan pass supply is sold out.");
  }
  if (fan.passIds.includes(passId)) {
    return state;
  }

  const updatedPass: FanPass = {
    ...pass,
    holders: pass.holders + 1,
    status: pass.holders + 1 >= pass.supply ? "sold_out" : pass.status,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...state,
    fanPasses: state.fanPasses.map((item) => (item.id === passId ? updatedPass : item)),
    fans: state.fans.map((item) =>
      item.id === fanId
        ? {
            ...item,
            passIds: [...item.passIds, passId],
          }
        : item,
    ),
  };
}

export function checkFanPassAccess(state: LoyaltyState, fanId: string, tierOrPassId: FanPassTier | string) {
  const fan = state.fans.find((item) => item.id === fanId);
  if (!fan) return false;

  const matchingPassIds = state.fanPasses
    .filter((pass) => pass.id === tierOrPassId || pass.tier === tierOrPassId)
    .map((pass) => pass.id);

  return fan.passIds.some((passId) => matchingPassIds.includes(passId));
}

function randomId() {
  return crypto.randomUUID();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
