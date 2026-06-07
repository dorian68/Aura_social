import { randomUUID } from "node:crypto";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { hashPassword, emailExists, createCredentials } from "@/lib/auth/credentials";
import { createSession, makeSessionCookie } from "@/lib/auth/session";
import { ok, fail } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();
    const displayName = (body.displayName ?? "").trim();
    const niche = body.niche ?? "other";
    const city = (body.city ?? "").trim() || null;

    if (!email || !password || !displayName)
      return fail("MISSING_FIELDS", "email, password and displayName are required", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail("INVALID_EMAIL", "Invalid email address", 400);
    if (password.length < 8)
      return fail("WEAK_PASSWORD", "Password must be at least 8 characters", 400);
    if (emailExists(email))
      return fail("EMAIL_TAKEN", "An account with this email already exists", 409);

    const passwordHash = await hashPassword(password);
    const db = getAuraDatabase();
    const now = new Date().toISOString();
    const creatorId = randomUUID();

    db.prepare(
      "INSERT INTO sf_creators (id, display_name, niche, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(creatorId, displayName, niche, city, now, now);

    createCredentials(creatorId, email, passwordHash);
    const sessionId = createSession(creatorId);

    const response = ok({ creator: { id: creatorId, displayName, niche, city, email } }, { sessionCreated: true });
    response.cookies.set(makeSessionCookie(sessionId));
    return response;
  } catch (err) {
    return fail("INTERNAL_ERROR", String(err), 500);
  }
}
