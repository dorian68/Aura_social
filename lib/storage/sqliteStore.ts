import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DomainError } from "@/lib/domainError";
import { databaseMigrations } from "./migrations";

interface StateRow {
  value_json: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface PersistedState<T> {
  value: T;
  revision: number;
}

interface AuraDatabaseGlobal {
  __auraDatabase?: Database.Database;
}

const globalForDatabase = globalThis as typeof globalThis & AuraDatabaseGlobal;

export function getAuraDatabase() {
  if (!globalForDatabase.__auraDatabase) {
    const databasePath = getDatabasePath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    database.pragma("synchronous = NORMAL");
    runDatabaseMigrations(database);
    globalForDatabase.__auraDatabase = database;
  }
  return globalForDatabase.__auraDatabase;
}

export function runDatabaseMigrations(database = getAuraDatabase()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    database
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all()
      .map((row) => Number((row as { version: number }).version)),
  );

  for (const migration of databaseMigrations) {
    if (applied.has(migration.version)) continue;
    const applyMigration = database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)")
        .run(migration.version, migration.name, new Date().toISOString());
    });
    applyMigration.immediate();
  }
}

export function readSqliteState<T>(
  key: string,
  fallback: () => T,
  legacyJsonPath?: string,
): PersistedState<T> {
  const database = getAuraDatabase();
  const row = database
    .prepare("SELECT value_json, revision, created_at, updated_at FROM state_documents WHERE key = ?")
    .get(key) as StateRow | undefined;

  if (row) {
    try {
      return { value: JSON.parse(row.value_json) as T, revision: row.revision };
    } catch (error) {
      throw new DomainError(
        "PERSISTENCE_CORRUPT_STATE",
        `Stored state for ${key} is not valid JSON.`,
        500,
        { key, cause: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  const initialValue = readLegacyJson<T>(legacyJsonPath) ?? fallback();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO state_documents (key, value_json, revision, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`,
    )
    .run(key, JSON.stringify(initialValue), now, now);
  return { value: initialValue, revision: 1 };
}

export function writeSqliteState<T>(key: string, value: T, expectedRevision: number) {
  const database = getAuraDatabase();
  const write = database.transaction(() => {
    const now = new Date().toISOString();
    const result = database
      .prepare(
        `UPDATE state_documents
         SET value_json = ?, revision = revision + 1, updated_at = ?
         WHERE key = ? AND revision = ?`,
      )
      .run(JSON.stringify(value), now, key, expectedRevision);

    if (result.changes !== 1) {
      const current = database
        .prepare("SELECT revision FROM state_documents WHERE key = ?")
        .get(key) as { revision: number } | undefined;
      throw new DomainError(
        "PERSISTENCE_CONFLICT",
        "State changed concurrently. Retry the operation with fresh state.",
        409,
        { key, expectedRevision, actualRevision: current?.revision ?? null },
      );
    }
  });

  write.immediate();
  return expectedRevision + 1;
}

export function deleteSqliteState(key: string) {
  getAuraDatabase().prepare("DELETE FROM state_documents WHERE key = ?").run(key);
}

export function getSqlitePersistenceStatus() {
  const database = getAuraDatabase();
  const databasePath = getDatabasePath();
  const rows = database
    .prepare("SELECT key, revision, length(value_json) AS bytes, updated_at FROM state_documents ORDER BY key")
    .all() as Array<{ key: string; revision: number; bytes: number; updated_at: string }>;
  const migrations = database
    .prepare("SELECT version, name, applied_at FROM schema_migrations ORDER BY version")
    .all();

  return {
    enabled: true,
    mode: "sqlite",
    databasePath,
    journalMode: String(database.pragma("journal_mode", { simple: true })),
    migrations,
    documents: rows.map((row) => ({
      key: row.key,
      revision: row.revision,
      bytes: row.bytes,
      updatedAt: row.updated_at,
    })),
  };
}

export function getDatabasePath() {
  const configured = process.env.AURA_DATABASE_PATH || parseSqliteDatabaseUrl(process.env.DATABASE_URL);
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), "data/aura-state/aura.sqlite");
}

function parseSqliteDatabaseUrl(value?: string) {
  if (!value) return "";
  if (value.startsWith("file:")) return value.slice("file:".length);
  if (value.startsWith("sqlite:")) return value.slice("sqlite:".length);
  return "";
}

function readLegacyJson<T>(filePath?: string): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}
