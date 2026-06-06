import { createDemoLoyaltyState } from "../lib/loyalty/mockLoyaltyData.ts";
import {
  awardPoints,
  calculateProgramStats,
  getProgramLedger,
  getTopFans,
  segmentFans,
} from "../lib/loyalty/loyaltyEngine.ts";
import { checkRewardEligibility, redeemReward } from "../lib/loyalty/rewardEngine.ts";

let state = createDemoLoyaltyState();
const programId = state.programs[0].id;
const fanId = state.fans[3].id;
const rewardId = state.rewards[0].id;
const beforeTier = state.fans.find((fan) => fan.id === fanId)?.tier;

state = awardPoints(state, {
  programId,
  fanId,
  actionType: "referral",
  referenceId: "debug_referral",
  metadata: {
    debug: true,
  },
});

const afterAwardFan = state.fans.find((fan) => fan.id === fanId);
const eligibility = checkRewardEligibility(state, programId, fanId, rewardId);
const redemption = redeemReward(state, { programId, fanId, rewardId });
state = redemption.state;

const output = {
  script: "debug-loyalty",
  success: true,
  program: state.programs[0],
  validation: {
    beforeTier,
    afterAwardTier: afterAwardFan?.tier,
    tierChanged: beforeTier !== afterAwardFan?.tier,
    eligibility,
    redeemedRewardId: rewardId,
  },
  stats: calculateProgramStats(state, programId),
  topFans: getTopFans(state, programId, 5).map((fan) => ({
    id: fan.id,
    handle: fan.instagramHandle,
    balance: fan.pointsBalance,
    tier: fan.tier,
  })),
  segments: segmentFans(state, programId),
  recentLedger: getProgramLedger(state, programId).slice(0, 5),
};

console.log(JSON.stringify(output, null, 2));
