import {
  deletePersistedState,
  readPersistedState,
  writePersistedState,
} from "../lib/storage/localJsonStore.ts";
import { getSqlitePersistenceStatus } from "../lib/storage/sqliteStore.ts";

const key = "smoke-concurrency-state.json";
deletePersistedState(key);

const initial = readPersistedState(key, () => ({ counter: 0 }));
const revision = writePersistedState(key, { counter: 1 }, initial.revision);
const persisted = readPersistedState(key, () => ({ counter: -1 }));

assert(persisted.value.counter === 1, "SQLite state mutation did not persist.");
assert(persisted.revision === revision, "SQLite revision did not increment.");

let conflictCode = "";
try {
  writePersistedState(key, { counter: 2 }, initial.revision);
} catch (error) {
  conflictCode = error?.code || "";
}
assert(conflictCode === "PERSISTENCE_CONFLICT", "Stale write was not rejected.");

const status = getSqlitePersistenceStatus();
assert(status.journalMode === "wal", "SQLite WAL mode is not active.");
assert(status.migrations.length >= 3, "Expected database migrations are missing.");

deletePersistedState(key);
console.log(JSON.stringify({
  script: "smoke-persistence",
  success: true,
  databasePath: status.databasePath,
  journalMode: status.journalMode,
  migrations: status.migrations,
  concurrency: {
    staleWriteRejected: true,
    conflictCode,
  },
}, null, 2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
