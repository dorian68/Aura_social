import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { createCreator } from "@/lib/superfan/db";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { displayName, bio, avatarUrl, city, niche } = body as Record<string, unknown>;
    if (!displayName) throw new DomainError("MISSING_DISPLAY_NAME", "displayName is required.", 400);

    const creator = createCreator({
      displayName: String(displayName),
      bio: bio ? String(bio) : undefined,
      avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
      city: city ? String(city) : undefined,
      niche: niche ? String(niche) : undefined,
    });
    return ok({ creator });
  } catch (e) { return handleApiError(e, "CREATE_CREATOR_ERROR"); }
}
