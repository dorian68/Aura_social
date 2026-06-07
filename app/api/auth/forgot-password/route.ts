import { type NextRequest } from "next/server";
import crypto from "node:crypto";
import { ok, fail } from "@/lib/apiResponse";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { getCredentialsByEmail } from "@/lib/auth/credentials";

const RESET_MAX_AGE = 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
    if (!email) return fail("VALIDATION_ERROR", "Email is required");
  } catch {
    return fail("INVALID_JSON", "Invalid request body");
  }

  // Always return success to prevent email enumeration
  const cred = getCredentialsByEmail(email);
  if (!cred) {
    // Still return success — don't leak whether email exists
    return ok({}, { message: "If this email is registered, a reset link was sent." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RESET_MAX_AGE * 1000).toISOString();

  const db = getAuraDatabase();
  // Invalidate any previous unused tokens for this creator
  db.prepare(
    "UPDATE sf_password_resets SET used = 1 WHERE creator_id = ? AND used = 0"
  ).run(cred.creatorId);

  db.prepare(
    "INSERT INTO sf_password_resets (id, creator_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)"
  ).run(crypto.randomUUID(), cred.creatorId, token, expiresAt, now);

  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3009"}/auth/reset?token=${token}`;

  // In development: return token in response for CLI testability
  // In production: send email via provider (Resend when configured)
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log(`[AUTH] Password reset token for ${email}: ${resetUrl}`);
    return ok(
      { resetToken: token },
      { message: "Reset link logged to server console (dev mode).", resetUrl }
    );
  }

  // TODO: integrate Resend when OUTREACH_SENDING_ENABLED=true and provider is configured
  console.log(`[AUTH] Password reset requested for ${email} — configure Resend to send email.`);
  return ok({}, { message: "If this email is registered, a reset link was sent." });
}
