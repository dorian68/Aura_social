import { ok, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { createCampaign, getCampaignsForCommunity } from "@/lib/superfan/db";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { communityId, partnerId, title, description, budgetAmount, commissionRate, startDate, endDate } = body as Record<string, unknown>;
    if (!communityId || !partnerId || !title) throw new DomainError("MISSING_PARAMS", "communityId, partnerId and title are required.", 400);
    const campaign = createCampaign({
      communityId: String(communityId), partnerId: String(partnerId),
      title: String(title), description: description ? String(description) : undefined,
      budgetAmount: Number(budgetAmount ?? 0), commissionRate: Number(commissionRate ?? 0.12),
      status: "active", startDate: startDate ? String(startDate) : new Date().toISOString(),
      endDate: endDate ? String(endDate) : undefined,
    });
    return ok({ campaign });
  } catch (e) { return handleApiError(e, "CREATE_CAMPAIGN_ERROR"); }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const communityId = url.searchParams.get("communityId");
    if (!communityId) throw new DomainError("MISSING_COMMUNITY", "communityId query param required.", 400);
    return ok({ campaigns: getCampaignsForCommunity(communityId) });
  } catch (e) { return handleApiError(e, "CAMPAIGNS_ERROR"); }
}
