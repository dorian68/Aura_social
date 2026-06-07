import { type NextRequest } from "next/server";
import { ok, fail } from "@/lib/apiResponse";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { hashPassword } from "@/lib/auth/credentials";

export async function POST(request: NextRequest) {
  let token: string;
  let password: string;
  try {
    const body = await request.json();
    token = (body.token ?? "").trim();
    password = body.password ?? "";
    if (!token) return fail("VALIDATION_ERROR", "Reset token is required");
    if (!password || password.length < 8) return fail("VALIDATION_ERROR", "Password must be at least 8 characters");
  } catch {
    return fail("INVALID_JSON", "Invalid request body");
  }

  const db = getAuraDatabase();

  const reset = db.prepare(`
    SELECT id, creator_id, expires_at, used
    FROM sf_password_resets
    WHERE token = ?
  `).get(token) as { id: string; creator_id: string; expires_at: string; used: number } | undefined;

  if (!reset) return fail("INVALID_TOKEN", "Reset link is invalid or has expired");
  if (reset.used) return fail("TOKEN_USED", "This reset link has already been used");
  if (new Date(reset.expires_at) < new Date()) return fail("TOKEN_EXPIRED", "This reset link has expired");

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  // Update password hash and mark token used atomically
  const update = db.transaction(() => {
    db.prepare(
      "UPDATE sf_creator_credentials SET password_hash = ?, updated_at = ? WHERE creator_id = ?"
    ).run(passwordHash, now, reset.creator_id);
    db.prepare(
      "UPDATE sf_password_resets SET used = 1 WHERE id = ?"
    ).run(reset.id);
    // Invalidate all existing sessions for this creator (security: force re-login)
    db.prepare(
      "DELETE FROM sf_sessions WHERE creator_id = ?"
    ).run(reset.creator_id);
  });
  update();

  return ok({}, { message: "Password updated. Please log in with your new password." });
}
