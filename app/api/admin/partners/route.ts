import { ok, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { createPartner } from "@/lib/superfan/db";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { creatorId, name, category, city, address, contactEmail, website, status } = body as Record<string, unknown>;
    if (!name) throw new DomainError("MISSING_NAME", "Partner name is required.", 400);
    const partner = createPartner({ creatorId: creatorId ? String(creatorId) : undefined, name: String(name), category: category ? String(category) : undefined, city: city ? String(city) : undefined, address: address ? String(address) : undefined, contactEmail: contactEmail ? String(contactEmail) : undefined, website: website ? String(website) : undefined, status: (status ?? "active") as "prospect" | "active" | "paused" });
    return ok({ partner });
  } catch (e) { return handleApiError(e, "CREATE_PARTNER_ERROR"); }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creatorId");
    const db = getAuraDatabase();
    const rows = creatorId
      ? db.prepare("SELECT * FROM sf_partners WHERE creator_id=? OR creator_id IS NULL ORDER BY name").all(creatorId)
      : db.prepare("SELECT * FROM sf_partners ORDER BY name").all();
    return ok({ partners: rows });
  } catch (e) { return handleApiError(e, "PARTNERS_ERROR"); }
}
