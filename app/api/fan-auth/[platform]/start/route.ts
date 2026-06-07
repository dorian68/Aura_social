import { NextResponse } from "next/server";
import { fail, handleApiError } from "@/lib/apiResponse";
import { buildFanAuthUrl, isPlatformConfigured } from "@/lib/platforms/oauth";
import { getFanById } from "@/lib/superfan/db";
import type { Platform } from "@/lib/superfan/types";

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const url = new URL(req.url);
    const fanId = url.searchParams.get("fanId");
    const redirectAfter = url.searchParams.get("redirectAfter") ?? undefined;

    if (!fanId) return fail("MISSING_FAN_ID", "fanId query param is required.", 400);
    if (!getFanById(fanId)) return fail("FAN_NOT_FOUND", `Fan ${fanId} not found.`, 404);

    if (!isPlatformConfigured(platform as Platform)) {
      return fail("PLATFORM_NOT_CONFIGURED", `${platform} OAuth is not configured on this server.`, 503);
    }

    const { url: authUrl, state } = buildFanAuthUrl(platform as Platform, fanId, redirectAfter);
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(`oauth_fan_state_${platform}`, state, { httpOnly: true, maxAge: 600, path: "/" });
    return response;
  } catch (e) { return handleApiError(e, "FAN_AUTH_START_ERROR"); }
}
