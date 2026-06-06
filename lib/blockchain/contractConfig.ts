import type { AuraContractAddresses } from "./types";

export const contractAddresses: Record<number, AuraContractAddresses> = {
  31337: {
    auraLoyaltyPoints: process.env.AURA_POINTS_CONTRACT_ADDRESS,
    auraFanPass: process.env.AURA_FAN_PASS_CONTRACT_ADDRESS,
    auraRewardRegistry: process.env.AURA_REWARD_REGISTRY_CONTRACT_ADDRESS,
  },
};

export function getContractAddresses(chainId = 31337) {
  return contractAddresses[chainId] || {};
}
