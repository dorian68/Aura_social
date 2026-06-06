import type { NextRequest } from "next/server";
import { fail, handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { createFanPass } from "@/lib/loyalty/fanPassEngine";
import { getDemoProgramId, getLoyaltyState, setLoyaltyState } from "@/lib/loyalty/store";
import { validateAmount, GuardrailError } from "@/lib/agentGuardrails";
import type { FanPassTier } from "@/lib/loyalty/types";

export async function GET(request: NextRequest) {
  const state = getLoyaltyState();
  const programId = request.nextUrl.searchParams.get("programId") || getDemoProgramId();
  return ok({
    fanPasses: state.fanPasses.filter((pass) => pass.programId === programId),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as {
      programId?: string;
      name?: string;
      tier?: FanPassTier;
      price?: number;
      supply?: number;
      benefits?: string[];
    };
    if (!body.programId || !body.name || !body.tier) {
      return fail("FAN_PASS_INVALID", "programId, name and tier are required.", 400);
    }
    let price: number;
    let supply: number;
    try {
      price = validateAmount(body.price, "price", { min: 0, allowZero: true });
      supply = validateAmount(body.supply, "supply", { min: 1 });
    } catch (e) {
      const err = e as GuardrailError;
      return fail(err.code || "FAN_PASS_INVALID", err.message, 400);
    }

    const result = createFanPass(getLoyaltyState(), {
      programId: body.programId,
      name: body.name,
      tier: body.tier,
      price,
      supply,
      benefits: body.benefits || [],
      status: "active",
    });
    setLoyaltyState(result.state);
    return ok({ fanPass: result.pass });
  } catch (error) {
    return handleApiError(error, "FAN_PASS_CREATE_FAILED");
  }
}
