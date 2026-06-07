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
  {
    version: 4,
    name: "superfan_os",
    sql: `
      CREATE TABLE IF NOT EXISTS sf_creators (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        city TEXT,
        niche TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_platform_accounts (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL REFERENCES sf_creators(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        handle TEXT NOT NULL,
        url TEXT,
        followers_count INTEGER,
        connected_status TEXT NOT NULL DEFAULT 'manual',
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(creator_id, platform)
      );

      CREATE TABLE IF NOT EXISTS sf_fans (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        whatsapp TEXT,
        city TEXT,
        referred_by TEXT REFERENCES sf_fans(id),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_communities (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL REFERENCES sf_creators(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        cover_image_url TEXT,
        brand_color TEXT NOT NULL DEFAULT '#B8FF4D',
        is_public INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_memberships (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        tier TEXT NOT NULL DEFAULT 'fan',
        referral_code TEXT NOT NULL UNIQUE,
        joined_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        UNIQUE(community_id, fan_id)
      );

      CREATE TABLE IF NOT EXISTS sf_points_ledger (
        id TEXT PRIMARY KEY,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        balance INTEGER NOT NULL DEFAULT 0,
        total_earned INTEGER NOT NULL DEFAULT 0,
        total_spent INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(fan_id, community_id)
      );

      CREATE TABLE IF NOT EXISTS sf_points_transactions (
        id TEXT PRIMARY KEY,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_challenges (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        points_reward INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'custom',
        status TEXT NOT NULL DEFAULT 'active',
        verification_method TEXT NOT NULL DEFAULT 'manual',
        max_completions INTEGER,
        expires_at TEXT,
        partner_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_challenge_completions (
        id TEXT PRIMARY KEY,
        challenge_id TEXT NOT NULL REFERENCES sf_challenges(id) ON DELETE CASCADE,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        proof_url TEXT,
        approved_at TEXT,
        approved_by TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(challenge_id, fan_id)
      );

      CREATE TABLE IF NOT EXISTS sf_rewards (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        points_cost INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'digital',
        stock INTEGER,
        redeemed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        partner_id TEXT,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_reward_redemptions (
        id TEXT PRIMARY KEY,
        reward_id TEXT NOT NULL REFERENCES sf_rewards(id) ON DELETE CASCADE,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        points_spent INTEGER NOT NULL,
        fulfillment_note TEXT,
        fulfilled_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        referred_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'confirmed',
        points_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(referrer_id, referred_id, community_id)
      );

      CREATE TABLE IF NOT EXISTS sf_partners (
        id TEXT PRIMARY KEY,
        creator_id TEXT REFERENCES sf_creators(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        category TEXT,
        city TEXT,
        address TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        website TEXT,
        status TEXT NOT NULL DEFAULT 'prospect',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_campaigns (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        partner_id TEXT NOT NULL REFERENCES sf_partners(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        budget_amount REAL NOT NULL DEFAULT 0,
        commission_rate REAL NOT NULL DEFAULT 0.12,
        commission_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        start_date TEXT NOT NULL,
        end_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_qr_codes (
        id TEXT PRIMARY KEY,
        campaign_id TEXT REFERENCES sf_campaigns(id) ON DELETE CASCADE,
        challenge_id TEXT REFERENCES sf_challenges(id) ON DELETE SET NULL,
        code TEXT NOT NULL UNIQUE,
        redirect_url TEXT NOT NULL,
        scan_count INTEGER NOT NULL DEFAULT 0,
        unique_scan_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_qr_scans (
        id TEXT PRIMARY KEY,
        qr_code_id TEXT NOT NULL REFERENCES sf_qr_codes(id) ON DELETE CASCADE,
        fan_id TEXT REFERENCES sf_fans(id) ON DELETE SET NULL,
        scanned_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_coupon_codes (
        id TEXT PRIMARY KEY,
        campaign_id TEXT REFERENCES sf_campaigns(id) ON DELETE CASCADE,
        reward_id TEXT REFERENCES sf_rewards(id) ON DELETE SET NULL,
        code TEXT NOT NULL UNIQUE,
        discount TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0,
        max_usage INTEGER,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sf_memberships_community ON sf_memberships(community_id);
      CREATE INDEX IF NOT EXISTS idx_sf_memberships_fan ON sf_memberships(fan_id);
      CREATE INDEX IF NOT EXISTS idx_sf_points_ledger_community ON sf_points_ledger(community_id);
      CREATE INDEX IF NOT EXISTS idx_sf_points_txn_fan_community ON sf_points_transactions(fan_id, community_id);
      CREATE INDEX IF NOT EXISTS idx_sf_challenges_community ON sf_challenges(community_id);
      CREATE INDEX IF NOT EXISTS idx_sf_completions_challenge ON sf_challenge_completions(challenge_id);
      CREATE INDEX IF NOT EXISTS idx_sf_rewards_community ON sf_rewards(community_id);
      CREATE INDEX IF NOT EXISTS idx_sf_platform_accounts_creator ON sf_platform_accounts(creator_id);
    `,
  },
  {
    version: 5,
    name: "fan_platform_accounts",
    sql: `
      CREATE TABLE IF NOT EXISTS sf_fan_platform_accounts (
        id TEXT PRIMARY KEY,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        handle TEXT NOT NULL,
        url TEXT,
        followers_count INTEGER,
        connected_status TEXT NOT NULL DEFAULT 'connected',
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(fan_id, platform)
      );

      CREATE INDEX IF NOT EXISTS idx_sf_fan_platform_fan ON sf_fan_platform_accounts(fan_id);
      CREATE INDEX IF NOT EXISTS idx_sf_fan_platform_platform ON sf_fan_platform_accounts(platform);
    `,
  },
  {
    version: 6,
    name: "signal_detection",
    sql: `
      CREATE TABLE IF NOT EXISTS sf_signal_rules (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        challenge_id TEXT REFERENCES sf_challenges(id) ON DELETE SET NULL,
        platform TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '[]',
        points_reward INTEGER NOT NULL DEFAULT 100,
        max_per_fan INTEGER,
        max_per_day INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sf_platform_signals (
        id TEXT PRIMARY KEY,
        fan_id TEXT NOT NULL REFERENCES sf_fans(id) ON DELETE CASCADE,
        community_id TEXT NOT NULL REFERENCES sf_communities(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        content_id TEXT NOT NULL,
        content_url TEXT,
        content_text TEXT,
        matched_rule_id TEXT REFERENCES sf_signal_rules(id) ON DELETE SET NULL,
        rewarded INTEGER NOT NULL DEFAULT 0,
        points_awarded INTEGER NOT NULL DEFAULT 0,
        detected_at TEXT NOT NULL,
        rewarded_at TEXT,
        UNIQUE(fan_id, platform, content_id)
      );

      ALTER TABLE sf_fan_platform_accounts ADD COLUMN last_scanned_at TEXT;

      CREATE INDEX IF NOT EXISTS idx_sf_signals_fan ON sf_platform_signals(fan_id);
      CREATE INDEX IF NOT EXISTS idx_sf_signals_community ON sf_platform_signals(community_id);
      CREATE INDEX IF NOT EXISTS idx_sf_signals_platform ON sf_platform_signals(platform);
      CREATE INDEX IF NOT EXISTS idx_sf_signal_rules_community ON sf_signal_rules(community_id);
    `,
  },
];
