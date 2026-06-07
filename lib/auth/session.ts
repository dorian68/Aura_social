import crypto from "node:crypto";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";

export const SESSION_COOKIE = "aura_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionCreator {
  id: string;
  email: string;
  displayName: string;
  niche: string | null;
}

export function createSession(creatorId: string): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  const db = getAuraDatabase();
  db.prepare(
    "INSERT INTO sf_sessions (id, creator_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(sessionId, creatorId, now, expiresAt);
  return sessionId;
}

export function getSessionCreator(sessionId: string): SessionCreator | null {
  const db = getAuraDatabase();
  const row = db.prepare(`
    SELECT c.id, cr.email, c.display_name AS displayName, c.niche
    FROM sf_sessions s
    JOIN sf_creators c ON c.id = s.creator_id
    JOIN sf_creator_credentials cr ON cr.creator_id = s.creator_id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId) as SessionCreator | undefined;
  return row ?? null;
}

export function deleteSession(sessionId: string): void {
  const db = getAuraDatabase();
  db.prepare("DELETE FROM sf_sessions WHERE id = ?").run(sessionId);
}

export function getSessionFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined }
): SessionCreator | null {
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSessionCreator(sessionId);
}

export function makeSessionCookie(sessionId: string) {
  return {
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

export function makeClearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  };
}
