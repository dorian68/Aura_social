import { createDefaultLoyaltyRules } from "./loyaltyRules";
import { calculateTier } from "./loyaltyEngine";
import { createDefaultTokenEconomy } from "./tokenEconomyEngine";
import type {
  CreatorProfile,
  FanPass,
  FanProfile,
  LoyaltyProgram,
  LoyaltyState,
  LoyaltyTransaction,
  Reward,
} from "./types";

const now = "2026-06-04T08:00:00.000Z";
const creatorId = "creator_aura_demo";
const programId = "program_aura_inner_circle";

export function createDemoLoyaltyState(): LoyaltyState {
  const creator: CreatorProfile = {
    id: creatorId,
    name: "Aura Demo Creator",
    handle: "@aura.creator",
    category: "Creator education and community",
    region: "Caribbean / France",
    connectedInstagramAccount: "@aura.creator",
    loyaltyProgramId: programId,
    createdAt: now,
  };

  const program: LoyaltyProgram = {
    id: programId,
    creatorId,
    name: "Aura Inner Circle",
    description: "A non-speculative loyalty program for activating superfans.",
    pointsName: "Aura Points",
    pointsSymbol: "AURA",
    status: "active",
    tokenizationMode: "offchain",
    createdAt: now,
    updatedAt: now,
  };

  const fans = buildFans();
  const rewards = buildRewards();
  const fanPasses = buildFanPasses();

  return {
    creators: [creator],
    programs: [program],
    rules: createDefaultLoyaltyRules(programId, now),
    fans,
    transactions: buildTransactions(fans),
    rewards,
    fanPasses,
    tokenEconomies: [createDefaultTokenEconomy(programId, 1_000_000)],
    recommendations: [],
    campaigns: [],
  };
}

function buildFans(): FanProfile[] {
  const rawFans = [
    ["fan_lina", "Lina Creation", "@lina.creation", 2420, ["top_fan", "buyer"], ["pass_vip"]],
    ["fan_max", "Max Visuals", "@max.visuals", 1680, ["superfan", "creator_peer"], ["pass_gold"]],
    ["fan_sofia", "Sofia Brand", "@sofia.brand", 920, ["buyer", "ugc"], ["pass_silver"]],
    ["fan_kevin", "Kevin Motion", "@kevin.motion", 470, ["near_superfan"], []],
    ["fan_jade", "Jade Community", "@jade.community", 430, ["near_superfan"], []],
    ["fan_marie", "Marie Live", "@marie.live", 180, ["commenter"], []],
    ["fan_noah", "Noah Studio", "@noah.studio", 95, ["new"], []],
    ["fan_ines", "Ines Art", "@ines.art", 55, ["new"], []],
  ] as const;

  return rawFans.map(([id, displayName, instagramHandle, pointsBalance, tags, passIds], index) => ({
    id,
    programId,
    displayName,
    instagramHandle,
    pointsBalance,
    lifetimePoints: pointsBalance + (index % 3) * 120,
    tier: calculateTier(pointsBalance),
    tags: [...tags],
    passIds: [...passIds],
    lastInteractionAt: new Date(Date.parse(now) - index * 86_400_000).toISOString(),
    createdAt: new Date(Date.parse(now) - (index + 4) * 86_400_000).toISOString(),
  }));
}

function buildTransactions(fans: FanProfile[]): LoyaltyTransaction[] {
  return fans.flatMap((fan, index) => [
    {
      id: `txn_seed_${fan.id}_earned`,
      programId,
      fanId: fan.id,
      actionType: index % 2 === 0 ? "comment" : "share",
      pointsDelta: fan.lifetimePoints,
      source: "instagram",
      referenceId: `seed_media_${index + 1}`,
      metadata: {
        seeded: true,
      },
      createdAt: new Date(Date.parse(now) - (index + 2) * 86_400_000).toISOString(),
    },
    ...(fan.lifetimePoints > fan.pointsBalance
      ? [
          {
            id: `txn_seed_${fan.id}_redeemed`,
            programId,
            fanId: fan.id,
            actionType: "reward_redemption" as const,
            pointsDelta: fan.pointsBalance - fan.lifetimePoints,
            source: "manual" as const,
            referenceId: "reward_seed",
            metadata: {
              seeded: true,
            },
            createdAt: new Date(Date.parse(now) - (index + 1) * 86_400_000).toISOString(),
          },
        ]
      : []),
  ]);
}

function buildRewards(): Reward[] {
  return [
    {
      id: "reward_discount_10",
      programId,
      name: "10% creator shop discount",
      description: "A simple commerce reward for engaged fans.",
      costInPoints: 250,
      rewardType: "discount",
      stock: null,
      redeemedCount: 8,
      status: "active",
      unlockCondition: "Available to Engaged Fans and above",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "reward_private_live",
      programId,
      name: "Private strategy live",
      description: "Access to a private monthly session.",
      costInPoints: 750,
      rewardType: "event_access",
      stock: 30,
      redeemedCount: 6,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "reward_vip_community",
      programId,
      name: "VIP community access",
      description: "Unlock the private community channel.",
      costInPoints: 1000,
      rewardType: "private_community",
      stock: 50,
      redeemedCount: 3,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildFanPasses(): FanPass[] {
  return [
    {
      id: "pass_bronze",
      programId,
      name: "Bronze Pass",
      tier: "bronze",
      price: 9,
      currency: "EUR",
      supply: 200,
      holders: 32,
      benefits: ["Member badge", "Monthly reward drop"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pass_gold",
      programId,
      name: "Gold Pass",
      tier: "gold",
      price: 19,
      currency: "EUR",
      supply: 100,
      holders: 18,
      benefits: ["Early access", "Private live replay", "Priority rewards"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pass_vip",
      programId,
      name: "VIP Pass",
      tier: "vip",
      price: 49,
      currency: "EUR",
      supply: 25,
      holders: 7,
      benefits: ["VIP channel", "Quarterly group call", "Premium drops"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];
}
