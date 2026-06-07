import { ok, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { createCommunity, updateCommunity, getCommunitiesForCreator, getCommunityBySlug } from "@/lib/superfan/db";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { creatorId, name, description, coverImageUrl, brandColor, isPublic, customSlug } = body as Record<string, unknown>;
    if (!creatorId || !name) throw new DomainError("MISSING_PARAMS", "creatorId and name are required.", 400);

    let slug = customSlug ? String(customSlug) : slugify(String(name));
    // Ensure slug is unique
    if (getCommunityBySlug(slug)) slug = `${slug}-${Date.now().toString(36)}`;

    const community = createCommunity({
      creatorId: String(creatorId), slug, name: String(name),
      description: description ? String(description) : undefined,
      coverImageUrl: coverImageUrl ? String(coverImageUrl) : undefined,
      brandColor: brandColor ? String(brandColor) : "#B8FF4D",
      isPublic: isPublic !== false,
    });
    return ok({ community });
  } catch (e) { return handleApiError(e, "CREATE_COMMUNITY_ERROR"); }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creatorId");
    if (!creatorId) throw new DomainError("MISSING_CREATOR", "creatorId query param required.", 400);
    return ok({ communities: getCommunitiesForCreator(creatorId) });
  } catch (e) { return handleApiError(e, "COMMUNITIES_ERROR"); }
}

export async function PATCH(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { id, ...updates } = body as Record<string, unknown>;
    if (!id) throw new DomainError("MISSING_ID", "Community id is required.", 400);
    const community = updateCommunity(String(id), updates as Parameters<typeof updateCommunity>[1]);
    return ok({ community });
  } catch (e) { return handleApiError(e, "UPDATE_COMMUNITY_ERROR"); }
}
