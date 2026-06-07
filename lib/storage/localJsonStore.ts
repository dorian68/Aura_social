import fs from "node:fs";
import path from "node:path";
import { getSqlitePersistenceStatus, readSqliteState, writeSqliteState, deleteSqliteState } from "./sqliteStore";

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data/aura-state");

export type PersistenceMode = "memory" | "sqlite" | "local_json";

export interface PersistenceSnapshot<T> {
  value: T;
  revision: number;
}

export function getPersistenceMode(): PersistenceMode {
  const configured = String(process.env.AURA_PERSISTENCE || "sqlite").toLowerCase();
  if (configured === "memory") return "memory";
  if (configured === "json" || configured === "local_json") return "local_json";
  return "sqlite";
}

export function isLocalPersistenceEnabled() {
  return getPersistenceMode() !== "memory";
}

export function readPersistedState<T>(fileName: string, fallback: () => T): PersistenceSnapshot<T> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { value: fallback(), revision: 0 };
  if (mode === "sqlite") {
    return readSqliteState(fileName, fallback, getStateFilePath(fileName));
  }

  const value = readLegacyJson(fileName, fallback);
  return { value, revision: getJsonRevision(fileName) };
}

export function writePersistedState<T>(
  fileName: string,
  value: T,
  expectedRevision: number,
) {
  const mode = getPersistenceMode();
  if (mode === "memory") return expectedRevision;
  if (mode === "sqlite") return writeSqliteState(fileName, value, expectedRevision);

  writeLegacyJson(fileName, value);
  return getJsonRevision(fileName);
}

export function deletePersistedState(fileName: string) {
  const mode = getPersistenceMode();
  if (mode === "memory") return;
  if (mode === "sqlite") {
    deleteSqliteState(fileName);
    return;
  }
  const filePath = getStateFilePath(fileName);
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

export function resetPersistedState<T>(
  fileName: string,
  fallback: () => T,
): PersistenceSnapshot<T> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { value: fallback(), revision: 0 };
  if (mode === "sqlite") {
    deleteSqliteState(fileName);
    return readSqliteState(fileName, fallback);
  }

  const value = fallback();
  writeLegacyJson(fileName, value);
  return { value, revision: getJsonRevision(fileName) };
}

// Compatibility wrappers for modules that do not need optimistic concurrency.
export function readLocalJson<T>(fileName: string, fallback: () => T): T {
  return readPersistedState(fileName, fallback).value;
}

export function writeLocalJson<T>(fileName: string, value: T) {
  const current = readPersistedState(fileName, () => value);
  writePersistedState(fileName, value, current.revision);
}

export function deleteLocalJson(fileName: string) {
  deletePersistedState(fileName);
}

export function getLocalPersistenceStatus() {
  const mode = getPersistenceMode();
  if (mode === "sqlite") return getSqlitePersistenceStatus();

  const dir = getStateDirectory();
  return {
    enabled: mode !== "memory",
    mode,
    directory: dir,
    files: getKnownStateFiles().map((fileName) => {
      const filePath = getStateFilePath(fileName);
      const exists = fs.existsSync(filePath);
      const stat = exists ? fs.statSync(filePath) : null;
      return {
        fileName,
        exists,
        bytes: stat?.size || 0,
        updatedAt: stat?.mtime.toISOString() || null,
      };
    }),
  };
}

function readLegacyJson<T>(fileName: string, fallback: () => T): T {
  const filePath = getStateFilePath(fileName);
  try {
    if (!fs.existsSync(filePath)) return fallback();
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback();
  }
}

function writeLegacyJson<T>(fileName: string, value: T) {
  const filePath = getStateFilePath(fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(tempPath, filePath);
}

function getJsonRevision(fileName: string) {
  const filePath = getStateFilePath(fileName);
  if (!fs.existsSync(filePath)) return 0;
  return Math.max(1, Math.floor(fs.statSync(filePath).mtimeMs));
}

function getKnownStateFiles() {
  return ["loyalty-state.json", "b2b-agent-state.json", "workspace-state.json"];
}

function getStateDirectory() {
  return process.env.AURA_STATE_DIR ? path.resolve(process.env.AURA_STATE_DIR) : DEFAULT_DATA_DIR;
}

function getStateFilePath(fileName: string) {
  const dir = getStateDirectory();
  const filePath = path.resolve(dir, fileName);
  const relativePath = path.relative(dir, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to access state file outside ${dir}`);
  }
  return filePath;
}
