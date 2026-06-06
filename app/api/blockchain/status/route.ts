import { ok } from "@/lib/apiResponse";
import {
  getContractAddresses,
  getContractStatusAsync,
  getSupportedChains,
  loadAbi,
} from "@/lib/blockchain/blockchainService";

export const runtime = "nodejs";

export async function GET() {
  const [status] = await Promise.all([getContractStatusAsync()]);
  return ok({
    status,
    supportedChains: getSupportedChains(),
    addresses: getContractAddresses(31337),
    abiStatus: {
      AuraLoyaltyPoints: loadAbi("AuraLoyaltyPoints").length,
      AuraFanPass: loadAbi("AuraFanPass").length,
      AuraRewardRegistry: loadAbi("AuraRewardRegistry").length,
    },
  });
}
