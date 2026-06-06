import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { calculateProgramStats } from "@/lib/loyalty/loyaltyEngine";
import { getDemoProgramId, getLoyaltyState } from "@/lib/loyalty/store";
import {
  applyLoyaltyStatsToEconomy,
  createDefaultTokenEconomy,
  simulateAirdrop,
  simulateRewardsPool,
  validateTokenEconomyConfig,
} from "@/lib/loyalty/tokenEconomyEngine";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as {
      programId?: string;
      totalSupply?: number;
      topFanCount?: number;
      averageAirdrop?: number;
      monthlyRewardBudget?: number;
      isTransferable?: boolean;
    };
    const state = getLoyaltyState();
    const programId = body.programId || getDemoProgramId();
    const stats = calculateProgramStats(state, programId);
    const economy = {
      ...createDefaultTokenEconomy(programId, body.totalSupply ?? 1_000_000),
      isTransferable: body.isTransferable ?? false,
    };
    const enrichedEconomy = applyLoyaltyStatsToEconomy(economy, stats);

    return ok({
      economy: enrichedEconomy,
      validation: validateTokenEconomyConfig(enrichedEconomy),
      airdrop: simulateAirdrop({
        economy: enrichedEconomy,
        topFanCount: body.topFanCount ?? 50,
        averageAirdrop: body.averageAirdrop ?? 200,
      }),
      rewardsPool: simulateRewardsPool({
        economy: enrichedEconomy,
        monthlyRewardBudget: body.monthlyRewardBudget ?? 20_000,
      }),
    });
  } catch (error) {
    return handleApiError(error, "TOKEN_ECONOMY_SIMULATION_FAILED");
  }
}
