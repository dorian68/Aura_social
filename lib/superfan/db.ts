import { randomUUID } from "node:crypto";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import type {
  Creator, PlatformAccount, FanPlatformAccount, Fan, CreatorCommunity, Membership,
  PointsLedger, PointsTransaction, Challenge, ChallengeCompletion,
  Reward, RewardRedemption, Referral, Partner, Campaign, QRCode,
  TxType, TxSource, CompletionStatus, Platform, ConnectedStatus,
} from "./types";
import { computeTier } from "./types";

export function uid() { return randomUUID(); }
export function now() { return new Date().toISOString(); }

// ─── Creators ────────────────────────────────────────────────────────────────

export function getCreator(id: string): Creator | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_creators WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapCreator(row) : null;
}

export function createCreator(data: Omit<Creator, "id" | "createdAt" | "updatedAt">): Creator {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare(`INSERT INTO sf_creators (id,display_name,bio,avatar_url,city,niche,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(id, data.displayName, data.bio ?? null, data.avatarUrl ?? null, data.city ?? null, data.niche ?? null, ts, ts);
  return getCreator(id)!;
}

export function updateCreator(id: string, data: Partial<Pick<Creator, "displayName"|"bio"|"avatarUrl"|"city"|"niche">>): Creator {
  const db = getAuraDatabase();
  const sets: string[] = []; const vals: unknown[] = [];
  if (data.displayName !== undefined) { sets.push("display_name=?"); vals.push(data.displayName); }
  if (data.bio !== undefined) { sets.push("bio=?"); vals.push(data.bio ?? null); }
  if (data.avatarUrl !== undefined) { sets.push("avatar_url=?"); vals.push(data.avatarUrl ?? null); }
  if (data.city !== undefined) { sets.push("city=?"); vals.push(data.city ?? null); }
  if (data.niche !== undefined) { sets.push("niche=?"); vals.push(data.niche ?? null); }
  if (sets.length > 0) { sets.push("updated_at=?"); vals.push(now()); vals.push(id); db.prepare(`UPDATE sf_creators SET ${sets.join(",")} WHERE id=?`).run(...vals); }
  return getCreator(id)!;
}

function mapCreator(r: Record<string, unknown>): Creator {
  return {
    id: String(r.id), displayName: String(r.display_name),
    bio: (r.bio as string) || undefined, avatarUrl: (r.avatar_url as string) || undefined,
    city: (r.city as string) || undefined, niche: (r.niche as string) || undefined,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

// ─── Platform Accounts ───────────────────────────────────────────────────────

export function upsertPlatformAccount(data: {
  creatorId: string; platform: Platform; handle: string; url?: string;
  followersCount?: number; connectedStatus?: ConnectedStatus;
  accessToken?: string; refreshToken?: string; tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
}): PlatformAccount {
  const db = getAuraDatabase();
  const ts = now();
  const existing = db.prepare("SELECT id FROM sf_platform_accounts WHERE creator_id=? AND platform=?")
    .get(data.creatorId, data.platform) as { id: string } | undefined;
  const id = existing?.id ?? uid();
  db.prepare(`INSERT INTO sf_platform_accounts
    (id,creator_id,platform,handle,url,followers_count,connected_status,access_token,refresh_token,token_expires_at,metadata_json,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(creator_id,platform) DO UPDATE SET
      handle=excluded.handle, url=excluded.url, followers_count=excluded.followers_count,
      connected_status=excluded.connected_status, access_token=excluded.access_token,
      refresh_token=excluded.refresh_token, token_expires_at=excluded.token_expires_at,
      metadata_json=excluded.metadata_json, updated_at=excluded.updated_at`).run(
    id, data.creatorId, data.platform, data.handle, data.url ?? null,
    data.followersCount ?? null, data.connectedStatus ?? "connected",
    data.accessToken ?? null, data.refreshToken ?? null, data.tokenExpiresAt ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null, ts, ts);
  return getPlatformAccountsForCreator(data.creatorId).find(a => a.platform === data.platform)!;
}

export function getPlatformAccountsForCreator(creatorId: string): PlatformAccount[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_platform_accounts WHERE creator_id=? ORDER BY created_at").all(creatorId) as Record<string, unknown>[];
  return rows.map(mapPlatformAccount);
}

export function getPlatformAccount(creatorId: string, platform: Platform): PlatformAccount | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_platform_accounts WHERE creator_id=? AND platform=?").get(creatorId, platform) as Record<string, unknown> | undefined;
  return row ? mapPlatformAccount(row) : null;
}

export function disconnectPlatform(creatorId: string, platform: Platform): void {
  const db = getAuraDatabase();
  db.prepare("UPDATE sf_platform_accounts SET connected_status='disconnected', access_token=NULL, refresh_token=NULL, updated_at=? WHERE creator_id=? AND platform=?")
    .run(now(), creatorId, platform);
}

function mapPlatformAccount(r: Record<string, unknown>): PlatformAccount {
  return {
    id: String(r.id), creatorId: String(r.creator_id), platform: r.platform as Platform,
    handle: String(r.handle), url: (r.url as string) || undefined,
    followersCount: r.followers_count != null ? Number(r.followers_count) : undefined,
    connectedStatus: r.connected_status as ConnectedStatus,
    tokenExpiresAt: (r.token_expires_at as string) || undefined,
    metadata: r.metadata_json ? JSON.parse(String(r.metadata_json)) : undefined,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

// ─── Fans ────────────────────────────────────────────────────────────────────

export function getFanByEmail(email: string): Fan | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_fans WHERE email=?").get(email.toLowerCase()) as Record<string, unknown> | undefined;
  return row ? mapFan(row) : null;
}

export function getFanById(id: string): Fan | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_fans WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapFan(row) : null;
}

export function createFan(data: { email: string; displayName?: string; whatsapp?: string; city?: string; referredBy?: string }): Fan {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare("INSERT INTO sf_fans (id,email,display_name,whatsapp,city,referred_by,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, data.email.toLowerCase(), data.displayName ?? null, data.whatsapp ?? null, data.city ?? null, data.referredBy ?? null, ts);
  return getFanById(id)!;
}

function mapFan(r: Record<string, unknown>): Fan {
  return {
    id: String(r.id), email: String(r.email),
    displayName: (r.display_name as string) || undefined,
    whatsapp: (r.whatsapp as string) || undefined,
    city: (r.city as string) || undefined,
    referredBy: (r.referred_by as string) || undefined,
    createdAt: String(r.created_at),
  };
}

// ─── Communities ─────────────────────────────────────────────────────────────

export function getCommunityBySlug(slug: string): CreatorCommunity | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_communities WHERE slug=?").get(slug) as Record<string, unknown> | undefined;
  return row ? mapCommunity(row) : null;
}

export function getCommunityById(id: string): CreatorCommunity | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_communities WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapCommunity(row) : null;
}

export function getCommunitiesForCreator(creatorId: string): CreatorCommunity[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_communities WHERE creator_id=? ORDER BY created_at").all(creatorId) as Record<string, unknown>[];
  return rows.map(mapCommunity);
}

export function createCommunity(data: Omit<CreatorCommunity, "id" | "createdAt" | "updatedAt">): CreatorCommunity {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare(`INSERT INTO sf_communities (id,creator_id,slug,name,description,cover_image_url,brand_color,is_public,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, data.creatorId, data.slug, data.name, data.description ?? null,
    data.coverImageUrl ?? null, data.brandColor, data.isPublic ? 1 : 0, ts, ts);
  return getCommunityById(id)!;
}

export function updateCommunity(id: string, data: Partial<Pick<CreatorCommunity, "name"|"description"|"coverImageUrl"|"brandColor"|"isPublic">>): CreatorCommunity {
  const db = getAuraDatabase();
  const fields: string[] = []; const vals: unknown[] = [];
  if (data.name !== undefined) { fields.push("name=?"); vals.push(data.name); }
  if (data.description !== undefined) { fields.push("description=?"); vals.push(data.description); }
  if (data.coverImageUrl !== undefined) { fields.push("cover_image_url=?"); vals.push(data.coverImageUrl); }
  if (data.brandColor !== undefined) { fields.push("brand_color=?"); vals.push(data.brandColor); }
  if (data.isPublic !== undefined) { fields.push("is_public=?"); vals.push(data.isPublic ? 1 : 0); }
  fields.push("updated_at=?"); vals.push(now()); vals.push(id);
  db.prepare(`UPDATE sf_communities SET ${fields.join(",")} WHERE id=?`).run(...vals);
  return getCommunityById(id)!;
}

function mapCommunity(r: Record<string, unknown>): CreatorCommunity {
  return {
    id: String(r.id), creatorId: String(r.creator_id), slug: String(r.slug),
    name: String(r.name), description: (r.description as string) || undefined,
    coverImageUrl: (r.cover_image_url as string) || undefined,
    brandColor: String(r.brand_color), isPublic: Boolean(r.is_public),
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

// ─── Memberships ─────────────────────────────────────────────────────────────

export function getMembership(communityId: string, fanId: string): Membership | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_memberships WHERE community_id=? AND fan_id=?").get(communityId, fanId) as Record<string, unknown> | undefined;
  return row ? mapMembership(row) : null;
}

export function getMembershipByReferralCode(code: string): Membership | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_memberships WHERE referral_code=?").get(code) as Record<string, unknown> | undefined;
  return row ? mapMembership(row) : null;
}

export function createMembership(communityId: string, fanId: string): Membership {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  const referralCode = randomUUID().slice(0, 8).toUpperCase();
  db.prepare("INSERT INTO sf_memberships (id,community_id,fan_id,tier,referral_code,joined_at,last_active_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, communityId, fanId, "fan", referralCode, ts, ts);
  return getMembership(communityId, fanId)!;
}

export function updateMembershipTier(communityId: string, fanId: string, tier: string): void {
  const db = getAuraDatabase();
  db.prepare("UPDATE sf_memberships SET tier=?,last_active_at=? WHERE community_id=? AND fan_id=?").run(tier, now(), communityId, fanId);
}

export function getFansInCommunity(communityId: string, limit = 100, offset = 0): Array<Fan & { membership: Membership; ledger: PointsLedger }> {
  const db = getAuraDatabase();
  const rows = db.prepare(`
    SELECT f.*, m.id as m_id, m.tier, m.referral_code, m.joined_at, m.last_active_at,
      COALESCE(l.balance,0) as balance, COALESCE(l.total_earned,0) as total_earned, COALESCE(l.total_spent,0) as total_spent
    FROM sf_fans f
    JOIN sf_memberships m ON m.fan_id=f.id AND m.community_id=?
    LEFT JOIN sf_points_ledger l ON l.fan_id=f.id AND l.community_id=?
    ORDER BY total_earned DESC
    LIMIT ? OFFSET ?`).all(communityId, communityId, limit, offset) as Record<string, unknown>[];
  return rows.map(r => ({
    id: String(r.id), email: String(r.email),
    displayName: (r.display_name as string) || undefined,
    whatsapp: (r.whatsapp as string) || undefined, city: (r.city as string) || undefined,
    referredBy: (r.referred_by as string) || undefined, createdAt: String(r.created_at),
    membership: { id: String(r.m_id), communityId, fanId: String(r.id), tier: r.tier as string,
      referralCode: String(r.referral_code), joinedAt: String(r.joined_at), lastActiveAt: String(r.last_active_at) } as Membership,
    ledger: { id: "", fanId: String(r.id), communityId, balance: Number(r.balance),
      totalEarned: Number(r.total_earned), totalSpent: Number(r.total_spent), updatedAt: "" } as PointsLedger,
  }));
}

function mapMembership(r: Record<string, unknown>): Membership {
  return { id: String(r.id), communityId: String(r.community_id), fanId: String(r.fan_id),
    tier: r.tier as string, referralCode: String(r.referral_code),
    joinedAt: String(r.joined_at), lastActiveAt: String(r.last_active_at) } as Membership;
}

// ─── Points ──────────────────────────────────────────────────────────────────

export function getLedger(fanId: string, communityId: string): PointsLedger {
  const db = getAuraDatabase();
  let row = db.prepare("SELECT * FROM sf_points_ledger WHERE fan_id=? AND community_id=?").get(fanId, communityId) as Record<string, unknown> | undefined;
  if (!row) {
    const id = uid(); const ts = now();
    db.prepare("INSERT INTO sf_points_ledger (id,fan_id,community_id,balance,total_earned,total_spent,updated_at) VALUES (?,?,?,0,0,0,?)").run(id, fanId, communityId, ts);
    row = db.prepare("SELECT * FROM sf_points_ledger WHERE fan_id=? AND community_id=?").get(fanId, communityId) as Record<string, unknown>;
  }
  return mapLedger(row);
}

export function awardPoints(fanId: string, communityId: string, amount: number, source: TxSource, sourceId?: string, note?: string): PointsLedger {
  const db = getAuraDatabase();
  getLedger(fanId, communityId); // ensure exists
  const tx = db.transaction(() => {
    db.prepare("UPDATE sf_points_ledger SET balance=balance+?,total_earned=total_earned+?,updated_at=? WHERE fan_id=? AND community_id=?")
      .run(amount, amount, now(), fanId, communityId);
    db.prepare("INSERT INTO sf_points_transactions (id,fan_id,community_id,type,amount,source,source_id,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(uid(), fanId, communityId, "earn" as TxType, amount, source, sourceId ?? null, note ?? null, now());
  });
  tx();
  const ledger = getLedger(fanId, communityId);
  // sync tier
  const tier = computeTier(ledger.totalEarned);
  updateMembershipTier(communityId, fanId, tier);
  return ledger;
}

export function spendPoints(fanId: string, communityId: string, amount: number, source: TxSource, sourceId?: string, note?: string): PointsLedger {
  const db = getAuraDatabase();
  const ledger = getLedger(fanId, communityId);
  if (ledger.balance < amount) throw new Error(`INSUFFICIENT_POINTS: balance=${ledger.balance} required=${amount}`);
  const tx = db.transaction(() => {
    db.prepare("UPDATE sf_points_ledger SET balance=balance-?,total_spent=total_spent+?,updated_at=? WHERE fan_id=? AND community_id=?")
      .run(amount, amount, now(), fanId, communityId);
    db.prepare("INSERT INTO sf_points_transactions (id,fan_id,community_id,type,amount,source,source_id,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(uid(), fanId, communityId, "redeem" as TxType, -amount, source, sourceId ?? null, note ?? null, now());
  });
  tx();
  return getLedger(fanId, communityId);
}

export function getTransactions(fanId: string, communityId: string, limit = 20, offset = 0): PointsTransaction[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_points_transactions WHERE fan_id=? AND community_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(fanId, communityId, limit, offset) as Record<string, unknown>[];
  return rows.map(r => ({
    id: String(r.id), fanId: String(r.fan_id), communityId: String(r.community_id),
    type: r.type as TxType, amount: Number(r.amount), source: r.source as TxSource,
    sourceId: (r.source_id as string) || undefined, note: (r.note as string) || undefined,
    createdAt: String(r.created_at),
  }));
}

function mapLedger(r: Record<string, unknown>): PointsLedger {
  return { id: String(r.id), fanId: String(r.fan_id), communityId: String(r.community_id),
    balance: Number(r.balance), totalEarned: Number(r.total_earned), totalSpent: Number(r.total_spent),
    updatedAt: String(r.updated_at) };
}

// ─── Challenges ──────────────────────────────────────────────────────────────

export function getChallengesForCommunity(communityId: string, status?: string): Challenge[] {
  const db = getAuraDatabase();
  const rows = (status
    ? db.prepare("SELECT c.*, (SELECT COUNT(*) FROM sf_challenge_completions cc WHERE cc.challenge_id=c.id AND cc.status='approved') as completion_count FROM sf_challenges c WHERE c.community_id=? AND c.status=? ORDER BY c.created_at DESC").all(communityId, status)
    : db.prepare("SELECT c.*, (SELECT COUNT(*) FROM sf_challenge_completions cc WHERE cc.challenge_id=c.id AND cc.status='approved') as completion_count FROM sf_challenges c WHERE c.community_id=? ORDER BY c.created_at DESC").all(communityId)
  ) as Record<string, unknown>[];
  return rows.map(mapChallenge);
}

export function getChallengeById(id: string): Challenge | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT c.*, (SELECT COUNT(*) FROM sf_challenge_completions cc WHERE cc.challenge_id=c.id AND cc.status='approved') as completion_count FROM sf_challenges c WHERE c.id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapChallenge(row) : null;
}

export function createChallenge(data: Omit<Challenge, "id"|"createdAt"|"updatedAt"|"completionCount">): Challenge {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare(`INSERT INTO sf_challenges (id,community_id,title,description,points_reward,type,status,verification_method,max_completions,expires_at,partner_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, data.communityId, data.title, data.description ?? null,
    data.pointsReward, data.type, data.status, data.verificationMethod, data.maxCompletions ?? null,
    data.expiresAt ?? null, data.partnerId ?? null, ts, ts);
  return getChallengeById(id)!;
}

export function updateChallenge(id: string, data: Partial<Pick<Challenge,"title"|"description"|"status"|"pointsReward"|"maxCompletions"|"expiresAt">>): Challenge {
  const db = getAuraDatabase();
  const fields: string[] = []; const vals: unknown[] = [];
  if (data.title !== undefined) { fields.push("title=?"); vals.push(data.title); }
  if (data.description !== undefined) { fields.push("description=?"); vals.push(data.description); }
  if (data.status !== undefined) { fields.push("status=?"); vals.push(data.status); }
  if (data.pointsReward !== undefined) { fields.push("points_reward=?"); vals.push(data.pointsReward); }
  if (data.maxCompletions !== undefined) { fields.push("max_completions=?"); vals.push(data.maxCompletions); }
  if (data.expiresAt !== undefined) { fields.push("expires_at=?"); vals.push(data.expiresAt); }
  fields.push("updated_at=?"); vals.push(now()); vals.push(id);
  db.prepare(`UPDATE sf_challenges SET ${fields.join(",")} WHERE id=?`).run(...vals);
  return getChallengeById(id)!;
}

export function getCompletion(challengeId: string, fanId: string): ChallengeCompletion | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_challenge_completions WHERE challenge_id=? AND fan_id=?").get(challengeId, fanId) as Record<string, unknown> | undefined;
  return row ? mapCompletion(row) : null;
}

export function getPendingCompletions(communityId: string): ChallengeCompletion[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_challenge_completions WHERE community_id=? AND status='pending' ORDER BY created_at").all(communityId) as Record<string, unknown>[];
  return rows.map(mapCompletion);
}

export function createCompletion(data: { challengeId: string; fanId: string; communityId: string; proofUrl?: string; status?: CompletionStatus }): ChallengeCompletion {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare("INSERT INTO sf_challenge_completions (id,challenge_id,fan_id,community_id,status,proof_url,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, data.challengeId, data.fanId, data.communityId, data.status ?? "pending", data.proofUrl ?? null, ts);
  return getCompletion(data.challengeId, data.fanId)!;
}

export function updateCompletionStatus(id: string, status: CompletionStatus, approvedBy?: string): void {
  const db = getAuraDatabase();
  db.prepare("UPDATE sf_challenge_completions SET status=?,approved_at=?,approved_by=? WHERE id=?")
    .run(status, status === "approved" ? now() : null, approvedBy ?? null, id);
}

export function getCompletionById(id: string): ChallengeCompletion | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_challenge_completions WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapCompletion(row) : null;
}

function mapChallenge(r: Record<string, unknown>): Challenge {
  return { id: String(r.id), communityId: String(r.community_id), title: String(r.title),
    description: (r.description as string) || undefined, pointsReward: Number(r.points_reward),
    type: r.type as Challenge["type"], status: r.status as Challenge["status"],
    verificationMethod: r.verification_method as Challenge["verificationMethod"],
    maxCompletions: r.max_completions != null ? Number(r.max_completions) : undefined,
    expiresAt: (r.expires_at as string) || undefined, partnerId: (r.partner_id as string) || undefined,
    completionCount: r.completion_count != null ? Number(r.completion_count) : 0,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at) };
}

function mapCompletion(r: Record<string, unknown>): ChallengeCompletion {
  return { id: String(r.id), challengeId: String(r.challenge_id), fanId: String(r.fan_id),
    communityId: String(r.community_id), status: r.status as CompletionStatus,
    proofUrl: (r.proof_url as string) || undefined, approvedAt: (r.approved_at as string) || undefined,
    approvedBy: (r.approved_by as string) || undefined, createdAt: String(r.created_at) };
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export function getRewardsForCommunity(communityId: string, status?: string): Reward[] {
  const db = getAuraDatabase();
  const rows = (status
    ? db.prepare("SELECT * FROM sf_rewards WHERE community_id=? AND status=? ORDER BY points_cost").all(communityId, status)
    : db.prepare("SELECT * FROM sf_rewards WHERE community_id=? ORDER BY points_cost").all(communityId)
  ) as Record<string, unknown>[];
  return rows.map(mapReward);
}

export function getRewardById(id: string): Reward | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_rewards WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapReward(row) : null;
}

export function createReward(data: Omit<Reward,"id"|"createdAt"|"updatedAt"|"redeemed">): Reward {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare(`INSERT INTO sf_rewards (id,community_id,title,description,image_url,points_cost,type,stock,redeemed,status,partner_id,expires_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,0,?,?,?,?,?)`).run(id, data.communityId, data.title, data.description ?? null,
    data.imageUrl ?? null, data.pointsCost, data.type, data.stock ?? null, data.status,
    data.partnerId ?? null, data.expiresAt ?? null, ts, ts);
  return getRewardById(id)!;
}

export function updateReward(id: string, data: Partial<Pick<Reward,"title"|"description"|"pointsCost"|"stock"|"status"|"expiresAt">>): Reward {
  const db = getAuraDatabase();
  const fields: string[] = []; const vals: unknown[] = [];
  if (data.title !== undefined) { fields.push("title=?"); vals.push(data.title); }
  if (data.description !== undefined) { fields.push("description=?"); vals.push(data.description); }
  if (data.pointsCost !== undefined) { fields.push("points_cost=?"); vals.push(data.pointsCost); }
  if (data.stock !== undefined) { fields.push("stock=?"); vals.push(data.stock); }
  if (data.status !== undefined) { fields.push("status=?"); vals.push(data.status); }
  if (data.expiresAt !== undefined) { fields.push("expires_at=?"); vals.push(data.expiresAt); }
  fields.push("updated_at=?"); vals.push(now()); vals.push(id);
  db.prepare(`UPDATE sf_rewards SET ${fields.join(",")} WHERE id=?`).run(...vals);
  return getRewardById(id)!;
}

export function redeemReward(rewardId: string, fanId: string, communityId: string): RewardRedemption {
  const db = getAuraDatabase();
  const reward = getRewardById(rewardId);
  if (!reward) throw new Error("REWARD_NOT_FOUND");
  if (reward.status !== "active") throw new Error("REWARD_UNAVAILABLE");
  if (reward.communityId !== communityId) throw new Error("REWARD_NOT_FOUND");
  if (reward.stock !== null && reward.stock !== undefined && reward.redeemed >= reward.stock) throw new Error("REWARD_OUT_OF_STOCK");
  const ledger = getLedger(fanId, communityId);
  if (ledger.balance < reward.pointsCost) throw new Error(`INSUFFICIENT_POINTS:${ledger.balance}:${reward.pointsCost}`);
  const id = uid(); const ts = now();
  const tx = db.transaction(() => {
    spendPoints(fanId, communityId, reward.pointsCost, "other" as TxSource, rewardId, `Redeemed: ${reward.title}`);
    db.prepare("INSERT INTO sf_reward_redemptions (id,reward_id,fan_id,community_id,status,points_spent,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, rewardId, fanId, communityId, "pending", reward.pointsCost, ts);
    db.prepare("UPDATE sf_rewards SET redeemed=redeemed+1,updated_at=? WHERE id=?").run(now(), rewardId);
  });
  tx();
  return db.prepare("SELECT * FROM sf_reward_redemptions WHERE id=?").get(id) as RewardRedemption;
}

export function getRedemptionById(id: string): RewardRedemption | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_reward_redemptions WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapRedemption(row) : null;
}

export function getPendingRedemptions(communityId: string): RewardRedemption[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_reward_redemptions WHERE community_id=? AND status='pending' ORDER BY created_at").all(communityId) as Record<string, unknown>[];
  return rows.map(mapRedemption);
}

export function updateRedemptionStatus(id: string, status: string, note?: string): void {
  const db = getAuraDatabase();
  db.prepare("UPDATE sf_reward_redemptions SET status=?,fulfillment_note=?,fulfilled_at=? WHERE id=?")
    .run(status, note ?? null, status === "fulfilled" ? now() : null, id);
}

function mapReward(r: Record<string, unknown>): Reward {
  return { id: String(r.id), communityId: String(r.community_id), title: String(r.title),
    description: (r.description as string) || undefined, imageUrl: (r.image_url as string) || undefined,
    pointsCost: Number(r.points_cost), type: r.type as Reward["type"],
    stock: r.stock != null ? Number(r.stock) : undefined, redeemed: Number(r.redeemed),
    status: r.status as Reward["status"], partnerId: (r.partner_id as string) || undefined,
    expiresAt: (r.expires_at as string) || undefined,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at) };
}

function mapRedemption(r: Record<string, unknown>): RewardRedemption {
  return { id: String(r.id), rewardId: String(r.reward_id), fanId: String(r.fan_id),
    communityId: String(r.community_id), status: r.status as RewardRedemption["status"],
    pointsSpent: Number(r.points_spent), fulfillmentNote: (r.fulfillment_note as string) || undefined,
    fulfilledAt: (r.fulfilled_at as string) || undefined, createdAt: String(r.created_at) };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function getLeaderboard(communityId: string, period: "alltime"|"monthly"|"weekly" = "alltime", limit = 50): Array<{
  rank: number; fanId: string; displayName: string; tier: string; points: number; joinedAt: string;
}> {
  const db = getAuraDatabase();
  let whereTxn = "";
  if (period === "monthly") {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
    whereTxn = `AND txn.created_at >= '${d.toISOString()}'`;
  } else if (period === "weekly") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    whereTxn = `AND txn.created_at >= '${d.toISOString()}'`;
  }
  const rows = db.prepare(`
    SELECT f.id as fan_id, COALESCE(f.display_name, SUBSTR(f.email,1,INSTR(f.email,'@')-1)) as display_name,
      m.tier, m.joined_at,
      COALESCE(SUM(CASE WHEN txn.type='earn' AND txn.community_id=? ${whereTxn} THEN txn.amount ELSE 0 END),0) as points
    FROM sf_fans f
    JOIN sf_memberships m ON m.fan_id=f.id AND m.community_id=?
    LEFT JOIN sf_points_transactions txn ON txn.fan_id=f.id AND txn.community_id=?
    GROUP BY f.id, f.display_name, m.tier, m.joined_at
    ORDER BY points DESC, m.joined_at ASC
    LIMIT ?`).all(communityId, communityId, communityId, limit) as Record<string, unknown>[];
  return rows.map((r, i) => ({
    rank: i + 1, fanId: String(r.fan_id), displayName: String(r.display_name),
    tier: String(r.tier), points: Number(r.points), joinedAt: String(r.joined_at),
  }));
}

export function getFanRank(communityId: string, fanId: string): { rank: number; total: number } {
  const db = getAuraDatabase();
  const board = getLeaderboard(communityId, "alltime", 9999);
  const idx = board.findIndex(r => r.fanId === fanId);
  return { rank: idx === -1 ? -1 : idx + 1, total: board.length };
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export function createReferral(referrerId: string, referredId: string, communityId: string, pointsAwarded: number): Referral {
  const db = getAuraDatabase();
  const id = uid();
  db.prepare("INSERT OR IGNORE INTO sf_referrals (id,referrer_id,referred_id,community_id,status,points_awarded,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, referrerId, referredId, communityId, "confirmed", pointsAwarded, now());
  return db.prepare("SELECT * FROM sf_referrals WHERE referrer_id=? AND referred_id=? AND community_id=?").get(referrerId, referredId, communityId) as Referral;
}

// ─── QR Codes ────────────────────────────────────────────────────────────────

export function createQRCode(data: { campaignId?: string; challengeId?: string; redirectUrl: string }): QRCode {
  const db = getAuraDatabase();
  const id = uid(); const code = randomUUID().slice(0, 12).toUpperCase(); const ts = now();
  db.prepare("INSERT INTO sf_qr_codes (id,campaign_id,challenge_id,code,redirect_url,scan_count,unique_scan_count,created_at) VALUES (?,?,?,?,?,0,0,?)")
    .run(id, data.campaignId ?? null, data.challengeId ?? null, code, data.redirectUrl, ts);
  return db.prepare("SELECT * FROM sf_qr_codes WHERE id=?").get(id) as QRCode;
}

export function getQRByCode(code: string): QRCode | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_qr_codes WHERE code=?").get(code) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { id: String(row.id), campaignId: (row.campaign_id as string)||undefined, challengeId: (row.challenge_id as string)||undefined,
    code: String(row.code), redirectUrl: String(row.redirect_url), scanCount: Number(row.scan_count),
    uniqueScanCount: Number(row.unique_scan_count), createdAt: String(row.created_at) };
}

export function recordQRScan(qrCodeId: string, fanId?: string): void {
  const db = getAuraDatabase();
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO sf_qr_scans (id,qr_code_id,fan_id,scanned_at) VALUES (?,?,?,?)").run(uid(), qrCodeId, fanId ?? null, now());
    db.prepare("UPDATE sf_qr_codes SET scan_count=scan_count+1 WHERE id=?").run(qrCodeId);
    if (fanId) {
      const already = db.prepare("SELECT COUNT(*) as c FROM sf_qr_scans WHERE qr_code_id=? AND fan_id=? LIMIT 2").get(qrCodeId, fanId) as { c: number };
      if (already.c <= 1) db.prepare("UPDATE sf_qr_codes SET unique_scan_count=unique_scan_count+1 WHERE id=?").run(qrCodeId);
    }
  });
  tx();
}

export function getQRStatsForCampaign(campaignId: string): { scans: number; uniqueScans: number; qrCodes: QRCode[] } {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_qr_codes WHERE campaign_id=?").all(campaignId) as Record<string, unknown>[];
  const qrCodes = rows.map(r => ({
    id: String(r.id), campaignId: campaignId, challengeId: (r.challenge_id as string)||undefined,
    code: String(r.code), redirectUrl: String(r.redirect_url), scanCount: Number(r.scan_count),
    uniqueScanCount: Number(r.unique_scan_count), createdAt: String(r.created_at)
  }));
  return { scans: qrCodes.reduce((s,q) => s+q.scanCount,0), uniqueScans: qrCodes.reduce((s,q) => s+q.uniqueScanCount,0), qrCodes };
}

// ─── Partners & Campaigns ────────────────────────────────────────────────────

export function createPartner(data: Omit<Partner,"id"|"createdAt"|"updatedAt">): Partner {
  const db = getAuraDatabase(); const id = uid(); const ts = now();
  db.prepare("INSERT INTO sf_partners (id,creator_id,name,category,city,address,contact_email,website,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, data.creatorId??null, data.name, data.category??null, data.city??null, data.address??null, data.contactEmail??null, data.website??null, data.status, ts, ts);
  return db.prepare("SELECT * FROM sf_partners WHERE id=?").get(id) as Partner;
}

export function createCampaign(data: Omit<Campaign,"id"|"createdAt"|"updatedAt"|"commissionAmount">): Campaign {
  const db = getAuraDatabase(); const id = uid(); const ts = now();
  const commission = data.budgetAmount * data.commissionRate;
  db.prepare("INSERT INTO sf_campaigns (id,community_id,partner_id,title,description,budget_amount,commission_rate,commission_amount,status,start_date,end_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, data.communityId, data.partnerId, data.title, data.description??null, data.budgetAmount, data.commissionRate, commission, data.status, data.startDate, data.endDate??null, ts, ts);
  return db.prepare("SELECT * FROM sf_campaigns WHERE id=?").get(id) as Campaign;
}

export function getCampaignsForCommunity(communityId: string): Campaign[] {
  const db = getAuraDatabase();
  return db.prepare("SELECT * FROM sf_campaigns WHERE community_id=? ORDER BY created_at DESC").all(communityId) as Campaign[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getCommunityStats(communityId: string) {
  const db = getAuraDatabase();
  const totalFans = (db.prepare("SELECT COUNT(*) as c FROM sf_memberships WHERE community_id=?").get(communityId) as {c:number}).c;
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const activeThisWeek = (db.prepare("SELECT COUNT(*) as c FROM sf_memberships WHERE community_id=? AND last_active_at>=?").get(communityId, weekAgo.toISOString()) as {c:number}).c;
  const totalPointsAwarded = (db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM sf_points_transactions WHERE community_id=? AND type='earn'").get(communityId) as {s:number}).s;
  const pendingCompletions = (db.prepare("SELECT COUNT(*) as c FROM sf_challenge_completions WHERE community_id=? AND status='pending'").get(communityId) as {c:number}).c;
  const pendingRedemptions = (db.prepare("SELECT COUNT(*) as c FROM sf_reward_redemptions WHERE community_id=? AND status='pending'").get(communityId) as {c:number}).c;
  const tierCounts = db.prepare("SELECT tier, COUNT(*) as c FROM sf_memberships WHERE community_id=? GROUP BY tier").all(communityId) as {tier:string;c:number}[];
  const tiers: Record<string,number> = {};
  tierCounts.forEach(t => { tiers[t.tier] = t.c; });
  const totalCampaignCommission = (db.prepare("SELECT COALESCE(SUM(commission_amount),0) as s FROM sf_campaigns WHERE community_id=? AND status IN ('active','ended','paid')").get(communityId) as {s:number}).s;
  return { totalFans, activeThisWeek, totalPointsAwarded, pendingCompletions, pendingRedemptions, tiers, totalCampaignCommission };
}

// ─── Fan Platform Accounts ───────────────────────────────────────────────────

export function upsertFanPlatformAccount(data: {
  fanId: string; platform: Platform; handle: string; url?: string;
  followersCount?: number; connectedStatus?: ConnectedStatus;
  accessToken?: string; refreshToken?: string; tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
}): FanPlatformAccount {
  const db = getAuraDatabase();
  const ts = now();
  const existing = db.prepare("SELECT id FROM sf_fan_platform_accounts WHERE fan_id=? AND platform=?")
    .get(data.fanId, data.platform) as { id: string } | undefined;
  const id = existing?.id ?? uid();
  const metaJson = data.metadata ? JSON.stringify(data.metadata) : null;
  if (existing) {
    db.prepare(`UPDATE sf_fan_platform_accounts SET handle=?,url=?,followers_count=?,connected_status=?,
      access_token=?,refresh_token=?,token_expires_at=?,metadata=?,updated_at=? WHERE id=?`)
      .run(data.handle, data.url ?? null, data.followersCount ?? null,
        data.connectedStatus ?? "connected", data.accessToken ?? null, data.refreshToken ?? null,
        data.tokenExpiresAt ?? null, metaJson, ts, id);
  } else {
    db.prepare(`INSERT INTO sf_fan_platform_accounts (id,fan_id,platform,handle,url,followers_count,
      connected_status,access_token,refresh_token,token_expires_at,metadata,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, data.fanId, data.platform, data.handle, data.url ?? null, data.followersCount ?? null,
        data.connectedStatus ?? "connected", data.accessToken ?? null, data.refreshToken ?? null,
        data.tokenExpiresAt ?? null, metaJson, ts, ts);
  }
  return getFanPlatformAccount(data.fanId, data.platform)!;
}

export function getFanPlatformAccounts(fanId: string): FanPlatformAccount[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_fan_platform_accounts WHERE fan_id=? ORDER BY created_at").all(fanId) as Record<string, unknown>[];
  return rows.map(mapFanPlatformAccount);
}

export function getFanPlatformAccount(fanId: string, platform: Platform): FanPlatformAccount | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_fan_platform_accounts WHERE fan_id=? AND platform=?").get(fanId, platform) as Record<string, unknown> | undefined;
  return row ? mapFanPlatformAccount(row) : null;
}

export function disconnectFanPlatform(fanId: string, platform: Platform): void {
  const db = getAuraDatabase();
  db.prepare("UPDATE sf_fan_platform_accounts SET connected_status='disconnected', updated_at=? WHERE fan_id=? AND platform=?")
    .run(now(), fanId, platform);
}

function mapFanPlatformAccount(r: Record<string, unknown>): FanPlatformAccount {
  return {
    id: String(r.id), fanId: String(r.fan_id), platform: r.platform as Platform,
    handle: String(r.handle), url: (r.url as string) || undefined,
    followersCount: r.followers_count != null ? Number(r.followers_count) : undefined,
    connectedStatus: r.connected_status as ConnectedStatus,
    tokenExpiresAt: (r.token_expires_at as string) || undefined,
    metadata: r.metadata ? JSON.parse(r.metadata as string) as Record<string, unknown> : undefined,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

// ─── Community Analytics ─────────────────────────────────────────────────────

export function getCommunityAnalytics(communityId: string) {
  const db = getAuraDatabase();

  // Fan platform distribution + reach
  const platformRows = db.prepare(`
    SELECT fpa.platform,
      COUNT(DISTINCT fpa.fan_id) as fan_count,
      COALESCE(SUM(fpa.followers_count), 0) as total_followers
    FROM sf_fan_platform_accounts fpa
    JOIN sf_memberships m ON m.fan_id = fpa.fan_id AND m.community_id = ?
    WHERE fpa.connected_status = 'connected'
    GROUP BY fpa.platform
    ORDER BY fan_count DESC
  `).all(communityId) as { platform: string; fan_count: number; total_followers: number }[];

  // Points earned by source
  const sourceRows = db.prepare(`
    SELECT source, COALESCE(SUM(amount), 0) as total
    FROM sf_points_transactions
    WHERE community_id = ? AND type = 'earn'
    GROUP BY source
    ORDER BY total DESC
  `).all(communityId) as { source: string; total: number }[];

  // New fans by week (last 8 weeks)
  const weekRows = db.prepare(`
    SELECT strftime('%Y-W%W', joined_at) as week, COUNT(*) as count
    FROM sf_memberships
    WHERE community_id = ?
    GROUP BY week
    ORDER BY week DESC
    LIMIT 8
  `).all(communityId) as { week: string; count: number }[];

  // Total fans with at least one connected platform
  const connectedFans = (db.prepare(`
    SELECT COUNT(DISTINCT fpa.fan_id) as c
    FROM sf_fan_platform_accounts fpa
    JOIN sf_memberships m ON m.fan_id = fpa.fan_id AND m.community_id = ?
    WHERE fpa.connected_status = 'connected'
  `).get(communityId) as { c: number }).c;

  const totalReach = platformRows.reduce((s, r) => s + r.total_followers, 0);

  return {
    platformDistribution: platformRows,
    pointsBySource: sourceRows,
    newFansByWeek: weekRows.reverse(),
    connectedFans,
    totalReach,
  };
}

// ─── Signal Rules ────────────────────────────────────────────────────────────

export interface SignalRuleRow {
  id: string; communityId: string; challengeId?: string;
  platform: string; signalType: string; keywords: string[];
  pointsReward: number; maxPerFan?: number; maxPerDay?: number;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export function createSignalRule(data: Omit<SignalRuleRow, "id"|"createdAt"|"updatedAt">): SignalRuleRow {
  const db = getAuraDatabase();
  const id = uid(); const ts = now();
  db.prepare(`INSERT INTO sf_signal_rules
    (id,community_id,challenge_id,platform,signal_type,keywords,points_reward,max_per_fan,max_per_day,is_active,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, data.communityId, data.challengeId ?? null, data.platform, data.signalType,
    JSON.stringify(data.keywords), data.pointsReward,
    data.maxPerFan ?? null, data.maxPerDay ?? null, data.isActive ? 1 : 0, ts, ts);
  return getSignalRule(id)!;
}

export function getSignalRule(id: string): SignalRuleRow | null {
  const db = getAuraDatabase();
  const row = db.prepare("SELECT * FROM sf_signal_rules WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? mapSignalRule(row) : null;
}

export function getSignalRulesForCommunity(communityId: string): SignalRuleRow[] {
  const db = getAuraDatabase();
  const rows = db.prepare("SELECT * FROM sf_signal_rules WHERE community_id=? ORDER BY created_at DESC").all(communityId) as Record<string, unknown>[];
  return rows.map(mapSignalRule);
}

export function updateSignalRule(id: string, data: Partial<Pick<SignalRuleRow, "keywords"|"pointsReward"|"maxPerFan"|"maxPerDay"|"isActive"|"challengeId">>): SignalRuleRow {
  const db = getAuraDatabase();
  const sets: string[] = []; const vals: unknown[] = [];
  if (data.keywords !== undefined) { sets.push("keywords=?"); vals.push(JSON.stringify(data.keywords)); }
  if (data.pointsReward !== undefined) { sets.push("points_reward=?"); vals.push(data.pointsReward); }
  if (data.maxPerFan !== undefined) { sets.push("max_per_fan=?"); vals.push(data.maxPerFan ?? null); }
  if (data.maxPerDay !== undefined) { sets.push("max_per_day=?"); vals.push(data.maxPerDay ?? null); }
  if (data.isActive !== undefined) { sets.push("is_active=?"); vals.push(data.isActive ? 1 : 0); }
  if (data.challengeId !== undefined) { sets.push("challenge_id=?"); vals.push(data.challengeId ?? null); }
  sets.push("updated_at=?"); vals.push(now()); vals.push(id);
  db.prepare(`UPDATE sf_signal_rules SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return getSignalRule(id)!;
}

export function deleteSignalRule(id: string): void {
  const db = getAuraDatabase();
  db.prepare("DELETE FROM sf_signal_rules WHERE id=?").run(id);
}

function mapSignalRule(r: Record<string, unknown>): SignalRuleRow {
  return {
    id: String(r.id), communityId: String(r.community_id),
    challengeId: (r.challenge_id as string) || undefined,
    platform: String(r.platform), signalType: String(r.signal_type),
    keywords: JSON.parse(String(r.keywords || "[]")) as string[],
    pointsReward: Number(r.points_reward),
    maxPerFan: r.max_per_fan != null ? Number(r.max_per_fan) : undefined,
    maxPerDay: r.max_per_day != null ? Number(r.max_per_day) : undefined,
    isActive: Boolean(r.is_active),
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

// ─── Platform Signals ─────────────────────────────────────────────────────────

export interface PlatformSignalRow {
  id: string; fanId: string; communityId: string; platform: string;
  signalType: string; contentId: string; contentUrl?: string; contentText?: string;
  matchedRuleId?: string; rewarded: boolean; pointsAwarded: number;
  detectedAt: string; rewardedAt?: string;
}

export function getSignalsForCommunity(communityId: string, limit = 50, offset = 0): PlatformSignalRow[] {
  const db = getAuraDatabase();
  const rows = db.prepare(`
    SELECT * FROM sf_platform_signals WHERE community_id=?
    ORDER BY detected_at DESC LIMIT ? OFFSET ?
  `).all(communityId, limit, offset) as Record<string, unknown>[];
  return rows.map(mapPlatformSignal);
}

export function getSignalStats(communityId: string) {
  const db = getAuraDatabase();
  const total = (db.prepare("SELECT COUNT(*) as c FROM sf_platform_signals WHERE community_id=?").get(communityId) as { c: number }).c;
  const rewarded = (db.prepare("SELECT COUNT(*) as c FROM sf_platform_signals WHERE community_id=? AND rewarded=1").get(communityId) as { c: number }).c;
  const totalPoints = (db.prepare("SELECT COALESCE(SUM(points_awarded),0) as s FROM sf_platform_signals WHERE community_id=?").get(communityId) as { s: number }).s;
  const byPlatform = db.prepare("SELECT platform, COUNT(*) as c FROM sf_platform_signals WHERE community_id=? GROUP BY platform").all(communityId) as { platform: string; c: number }[];
  return { total, rewarded, totalPoints, byPlatform };
}

function mapPlatformSignal(r: Record<string, unknown>): PlatformSignalRow {
  return {
    id: String(r.id), fanId: String(r.fan_id), communityId: String(r.community_id),
    platform: String(r.platform), signalType: String(r.signal_type),
    contentId: String(r.content_id), contentUrl: (r.content_url as string) || undefined,
    contentText: (r.content_text as string) || undefined,
    matchedRuleId: (r.matched_rule_id as string) || undefined,
    rewarded: Boolean(r.rewarded), pointsAwarded: Number(r.points_awarded),
    detectedAt: String(r.detected_at), rewardedAt: (r.rewarded_at as string) || undefined,
  };
}

// ─── Global Superfan Stats (for health endpoint) ──────────────────────────────

export function getSuperfanGlobalStats() {
  const db = getAuraDatabase();
  const creators    = (db.prepare("SELECT COUNT(*) as c FROM sf_creators").get() as { c: number }).c;
  const communities = (db.prepare("SELECT COUNT(*) as c FROM sf_communities").get() as { c: number }).c;
  const fans        = (db.prepare("SELECT COUNT(*) as c FROM sf_fans").get() as { c: number }).c;
  const memberships = (db.prepare("SELECT COUNT(*) as c FROM sf_memberships").get() as { c: number }).c;
  const pointsAwarded = (db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM sf_points_transactions WHERE type='earn'").get() as { s: number }).s;
  const challenges  = (db.prepare("SELECT COUNT(*) as c FROM sf_challenges WHERE status='active'").get() as { c: number }).c;
  const rewards     = (db.prepare("SELECT COUNT(*) as c FROM sf_rewards WHERE status='active'").get() as { c: number }).c;
  const fanPlatformAccounts = (db.prepare("SELECT COUNT(*) as c FROM sf_fan_platform_accounts WHERE connected_status='connected'").get() as { c: number }).c;
  const signalRules = (db.prepare("SELECT COUNT(*) as c FROM sf_signal_rules WHERE is_active=1").get() as { c: number }).c;
  const signalsDetected = (db.prepare("SELECT COUNT(*) as c FROM sf_platform_signals").get() as { c: number }).c;
  const signalsRewarded = (db.prepare("SELECT COUNT(*) as c FROM sf_platform_signals WHERE rewarded=1").get() as { c: number }).c;
  return { creators, communities, fans, memberships, pointsAwarded, activeChallenges: challenges, activeRewards: rewards, fanPlatformAccounts, signalRules, signalsDetected, signalsRewarded };
}
