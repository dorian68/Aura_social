import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createCredentials(creatorId: string, email: string, passwordHash: string): void {
  const db = getAuraDatabase();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sf_creator_credentials (id, creator_id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), creatorId, email.toLowerCase().trim(), passwordHash, now, now);
}

export function getCredentialsByEmail(email: string) {
  const db = getAuraDatabase();
  return db.prepare(
    "SELECT id, creator_id AS creatorId, email, password_hash AS passwordHash FROM sf_creator_credentials WHERE email = ? COLLATE NOCASE"
  ).get(email.trim()) as { id: string; creatorId: string; email: string; passwordHash: string } | undefined;
}

export function emailExists(email: string): boolean {
  const db = getAuraDatabase();
  return !!db.prepare("SELECT 1 FROM sf_creator_credentials WHERE email = ? COLLATE NOCASE").get(email.trim());
}
