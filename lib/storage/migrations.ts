export interface DatabaseMigration {
  version: number;
  name: string;
  sql: string;
}

export const databaseMigrations: DatabaseMigration[] = [
  {
    version: 1,
    name: "state_documents",
    sql: `
      CREATE TABLE IF NOT EXISTS state_documents (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: "provider_operations",
    sql: `
      CREATE TABLE IF NOT EXISTS provider_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_type TEXT NOT NULL,
        external_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        processed_at TEXT,
        UNIQUE(provider, external_id)
      );

      CREATE TABLE IF NOT EXISTS payment_records (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        opportunity_id TEXT NOT NULL,
        campaign_id TEXT,
        provider TEXT NOT NULL,
        checkout_session_id TEXT,
        payment_intent_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(provider, checkout_session_id)
      );

      CREATE TABLE IF NOT EXISTS outreach_deliveries (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        outreach_draft_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL,
        provider_message_id TEXT,
        dry_run INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 3,
    name: "workspace_memberships",
    sql: `
      CREATE TABLE IF NOT EXISTS workspace_memberships (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(workspace_id, subject)
      );
    `,
  },
];
