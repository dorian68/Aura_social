import { getSqlitePersistenceStatus, runDatabaseMigrations } from "../lib/storage/sqliteStore.ts";

runDatabaseMigrations();
console.log(JSON.stringify({
  script: "migrate-database",
  success: true,
  persistence: getSqlitePersistenceStatus(),
}, null, 2));
