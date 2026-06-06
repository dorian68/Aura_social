import { handleApiError, ok, readJsonBody } from "@/lib/apiResponse";
import { simulatePassLaunch } from "@/lib/loyalty/fanPassEngine";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody(request)) as {
      followerCount?: number;
      strongEngagementRate?: number;
      expectedConversionRate?: number;
      passPrice?: number;
      supply?: number;
    };

    return ok({
      simulation: simulatePassLaunch({
        followerCount: body.followerCount ?? 50_000,
        strongEngagementRate: body.strongEngagementRate ?? 2.5,
        expectedConversionRate: body.expectedConversionRate ?? 0.5,
        passPrice: body.passPrice ?? 19,
        supply: body.supply ?? 500,
      }),
    });
  } catch (error) {
    return handleApiError(error, "FAN_PASS_SIMULATION_FAILED");
  }
}
