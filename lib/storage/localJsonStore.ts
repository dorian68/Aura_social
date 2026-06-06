import fs from "node:fs";
import path from "node:path";

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data/aura-state");

export function isLocalPersistenceEnabled() {
  return String(process.env.AURA_PERSISTENCE || "local").toLowerCase() !== "memory";
}

export function readLocalJson<T>(fileName: string, fallback: () => T): T {
  if (!isLocalPersistenceEnabled()) return fallback();
  const filePath = getStateFilePath(fileName);
  try {
    if (!fs.existsSync(filePath)) return fallback();
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback();
  }
}

export function writeLocalJson<T>(fileName: string, value: T) {
  if (!isLocalPersistenceEnabled()) return;
  const filePath = getStateFilePath(fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

export function deleteLocalJson(fileName: string) {
  if (!isLocalPersistenceEnabled()) return;
  const filePath = getStateFilePath(fileName);
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

export function getLocalPersistenceStatus() {
  const dir = process.env.AURA_STATE_DIR ? path.resolve(process.env.AURA_STATE_DIR) : DEFAULT_DATA_DIR;
  return {
    enabled: isLocalPersistenceEnabled(),
    mode: isLocalPersistenceEnabled() ? "local_json" : "memory",
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

function getKnownStateFiles() {
  return ["loyalty-state.json", "b2b-agent-state.json", "workspace-state.json"];
}

function getStateFilePath(fileName: string) {
  const dir = process.env.AURA_STATE_DIR ? path.resolve(process.env.AURA_STATE_DIR) : DEFAULT_DATA_DIR;
  const filePath = path.resolve(dir, fileName);
  const relativePath = path.relative(dir, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to access state file outside ${dir}`);
  }
  return filePath;
}
