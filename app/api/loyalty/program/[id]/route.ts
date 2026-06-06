import { fail, ok } from "@/lib/apiResponse";
import { calculateProgramStats, segmentFans } from "@/lib/loyalty/loyaltyEngine";
import { getLoyaltyState } from "@/lib/loyalty/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const state = getLoyaltyState();
  const program = state.programs.find((item) => item.id === id);

  if (!program) {
    return fail("LOYALTY_PROGRAM_NOT_FOUND", "Loyalty program was not found.", 404);
  }

  return ok({
    program,
    rules: state.rules.filter((rule) => rule.programId === id),
    fans: state.fans.filter((fan) => fan.programId === id),
    rewards: state.rewards.filter((reward) => reward.programId === id),
    fanPasses: state.fanPasses.filter((pass) => pass.programId === id),
    tokenEconomy: state.tokenEconomies.find((economy) => economy.programId === id),
    stats: calculateProgramStats(state, id),
    segments: segmentFans(state, id),
  });
}
