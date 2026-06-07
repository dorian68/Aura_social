import { NextResponse } from "next/server";
import { fail, handleApiError } from "@/lib/apiResponse";
import { buildAuthUrl, isPlatformConfigured } from "@/lib/platforms/oauth";
import type { Platform } from "@/lib/superfan/types";

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creatorId");
    const redirectAfter = url.searchParams.get("redirectAfter") ?? undefined;

    if (!creatorId) return fail("MISSING_CREATOR_ID", "creatorId query param is required.", 400);

    if (!isPlatformConfigured(platform as Platform)) {
      return fail("PLATFORM_NOT_CONFIGURED", `${platform} OAuth is not configured on this server. Set the required environment variables.`, 503, {
        platform,
        requiredEnvVars: getRequiredEnvVars(platform),
      });
    }

    const { url: authUrl, state } = buildAuthUrl(platform as Platform, creatorId, redirectAfter);
    // Store state in a short-lived cookie for CSRF validation
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(`oauth_state_${platform}`, state, { httpOnly: true, maxAge: 600, path: "/" });
    return response;
  } catch (e) { return handleApiError(e, "PLATFORM_AUTH_START_ERROR"); }
}

function getRequiredEnvVars(platform: string): string[] {
  const vars: Record<string, string[]> = {
    instagram: ["META_APP_ID", "META_APP_SECRET"],
    youtube: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
    tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    twitch: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"],
    discord: ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"],
  };
  return vars[platform] ?? [];
}
