import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { getCredentialsByEmail, verifyPassword } from "@/lib/auth/credentials";
import { createSession, makeSessionCookie } from "@/lib/auth/session";
import { ok, fail } from "@/lib/apiResponse";

const DUMMY_HASH = "$2b$12$KIXgQDBSJSCvAOtAIDW6w.invalidhashfortimingsafety0000000";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email ?? "").trim();
    const password = (body.password ?? "").trim();

    if (!email || !password)
      return fail("MISSING_FIELDS", "email and password are required", 400);

    const creds = getCredentialsByEmail(email);
    if (!creds) {
      await verifyPassword("dummy", DUMMY_HASH); // timing-safe: prevent email enumeration
      return fail("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, creds.passwordHash);
    if (!valid)
      return fail("INVALID_CREDENTIALS", "Invalid email or password", 401);

    const db = getAuraDatabase();
    const creator = db.prepare(
      "SELECT id, display_name AS displayName, niche, city FROM sf_creators WHERE id = ?"
    ).get(creds.creatorId) as { id: string; displayName: string; niche: string | null; city: string | null } | undefined;

    if (!creator)
      return fail("CREATOR_NOT_FOUND", "Creator profile not found", 404);

    // Fetch their communities for post-login redirect
    const communities = db.prepare(
      "SELECT id, slug, name, brand_color AS brandColor FROM sf_communities WHERE creator_id = ? ORDER BY created_at ASC"
    ).all(creator.id) as { id: string; slug: string; name: string; brandColor: string }[];

    const sessionId = createSession(creds.creatorId);
    const response = ok({ creator: { ...creator, email: creds.email }, communities });
    response.cookies.set(makeSessionCookie(sessionId));
    return response;
  } catch (err) {
    return fail("INTERNAL_ERROR", String(err), 500);
  }
}
