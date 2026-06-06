import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { createLoyaltyProgram } from "@/lib/loyalty/loyaltyEngine";
import { createDefaultLoyaltyRules } from "@/lib/loyalty/loyaltyRules";
import { getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { createDefaultTokenEconomy } from "@/lib/loyalty/tokenEconomyEngine";
import type { CreateProgramInput } from "@/lib/loyalty/types";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as Partial<CreateProgramInput>;
    if (!body.creatorId || !body.name) {
      return fail("LOYALTY_PROGRAM_INVALID", "creatorId and name are required.", 400);
    }

    const current = getLoyaltyState();
    const next = createLoyaltyProgram(current, body as CreateProgramInput);
    const program = next.programs.at(-1);
    if (!program) {
      return fail("LOYALTY_PROGRAM_CREATE_FAILED", "Program could not be created.", 500);
    }

    const enriched = {
      ...next,
      rules: [...next.rules, ...createDefaultLoyaltyRules(program.id)],
      tokenEconomies: [...next.tokenEconomies, createDefaultTokenEconomy(program.id)],
    };
    setLoyaltyState(enriched);

    return ok({ program });
  } catch (error) {
    return handleApiError(error, "LOYALTY_PROGRAM_CREATE_FAILED");
  }
}
