import { cookies } from "next/headers";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { getSessionFromCookies } from "@/lib/auth/session";
import { ok, fail } from "@/lib/apiResponse";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const creator = getSessionFromCookies(cookieStore);
    if (!creator)
      return fail("NOT_AUTHENTICATED", "No active session", 401);

    const db = getAuraDatabase();
    const communities = db.prepare(
      "SELECT id, slug, name, brand_color AS brandColor FROM sf_communities WHERE creator_id = ? ORDER BY created_at ASC"
    ).all(creator.id) as { id: string; slug: string; name: string; brandColor: string }[];

    return ok({ creator, communities });
  } catch (err) {
    return fail("INTERNAL_ERROR", String(err), 500);
  }
}
