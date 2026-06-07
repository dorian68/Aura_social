import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { getFansInCommunity } from "@/lib/superfan/db";
import type { Platform } from "@/lib/superfan/types";
import type { SignalRule, ScanResult, TokenData } from "./types";
import { processSignal } from "./processor";
import { scanInstagram } from "./scanners/instagram";
import { scanTikTok } from "./scanners/tiktok";
import { scanYouTube } from "./scanners/youtube";
import { scanTwitch } from "./scanners/twitch";

function getFanTokenData(fanId: string, platform: Platform): TokenData | null {
  const db = getAuraDatabase();
  const row = db.prepare(
    "SELECT access_token, refresh_token, token_expires_at, metadata FROM sf_fan_platform_accounts WHERE fan_id=? AND platform=? AND connected_status='connected'"
  ).get(fanId, platform) as {
    access_token: string | null;
    refresh_token: string | null;
    token_expires_at: string | null;
    metadata: string | null;
  } | undefined;
  if (!row?.access_token) return null;
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    tokenExpiresAt: row.token_expires_at ?? undefined,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
  };
}

function getCreatorTokenData(creatorId: string, platform: Platform): TokenData | null {
  const db = getAuraDatabase();
  const row = db.prepare(
    "SELECT access_token, metadata_json FROM sf_platform_accounts WHERE creator_id=? AND platform=? AND connected_status='connected'"
  ).get(creatorId, platform) as { access_token: string | null; metadata_json: string | null } | undefined;
  if (!row?.access_token) return null;
  return {
    accessToken: row.access_token,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
  };
}

export function getSignalRulesForCommunity(communityId: string): SignalRule[] {
  const db = getAuraDatabase();
  const rows = db.prepare(
    "SELECT * FROM sf_signal_rules WHERE community_id=? AND is_active=1"
  ).all(communityId) as Record<string, unknown>[];
  return rows.map(r => ({
    id: String(r.id), communityId: String(r.community_id),
    challengeId: (r.challenge_id as string) || undefined,
    platform: r.platform as Platform,
    signalType: r.signal_type as SignalRule["signalType"],
    keywords: JSON.parse(String(r.keywords || "[]")) as string[],
    pointsReward: Number(r.points_reward),
    maxPerFan: r.max_per_fan != null ? Number(r.max_per_fan) : undefined,
    maxPerDay: r.max_per_day != null ? Number(r.max_per_day) : undefined,
    isActive: Boolean(r.is_active),
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  }));
}

function updateLastScanned(fanId: string, platform: Platform): void {
  const db = getAuraDatabase();
  db.prepare("UPDATE sf_fan_platform_accounts SET last_scanned_at=? WHERE fan_id=? AND platform=?")
    .run(new Date().toISOString(), fanId, platform);
}

function getLastScanned(fanId: string, platform: Platform): string | null {
  const db = getAuraDatabase();
  const row = db.prepare(
    "SELECT last_scanned_at FROM sf_fan_platform_accounts WHERE fan_id=? AND platform=?"
  ).get(fanId, platform) as { last_scanned_at: string | null } | undefined;
  return row?.last_scanned_at ?? null;
}

export async function scanFan(
  fanId: string,
  communityId: string,
  creatorId: string,
  platform: Platform,
): Promise<ScanResult> {
  const result: ScanResult = { fanId, platform, signalsDetected: 0, signalsRewarded: 0, pointsAwarded: 0 };

  const token = getFanTokenData(fanId, platform);
  if (!token) { result.error = "no_token"; return result; }

  if (token.tokenExpiresAt && new Date(token.tokenExpiresAt) <= new Date()) {
    result.error = "token_expired";
    return result;
  }

  const rules = getSignalRulesForCommunity(communityId).filter(r => r.platform === platform);
  if (rules.length === 0) { result.error = "no_rules"; return result; }

  const lastScannedAt = getLastScanned(fanId, platform) ?? undefined;

  let rawSignals;
  try {
    switch (platform) {
      case "instagram":
        rawSignals = await scanInstagram({ accessToken: token.accessToken, lastScannedAt });
        break;
      case "tiktok":
        rawSignals = await scanTikTok({ accessToken: token.accessToken, lastScannedAt });
        break;
      case "youtube":
        rawSignals = await scanYouTube({ accessToken: token.accessToken, lastScannedAt });
        break;
      case "twitch": {
        const creatorToken = getCreatorTokenData(creatorId, "twitch");
        const creatorMeta = creatorToken?.metadata as Record<string, string> | undefined;
        const fanMeta = token.metadata as Record<string, string> | undefined;
        if (!creatorToken || !creatorMeta?.broadcaster_id || !fanMeta?.twitch_user_id) {
          result.error = "twitch_missing_metadata";
          return result;
        }
        rawSignals = await scanTwitch({
          fanAccessToken: token.accessToken,
          creatorBroadcasterId: creatorMeta.broadcaster_id,
          fanTwitchUserId: fanMeta.twitch_user_id,
          lastScannedAt,
        });
        break;
      }
      default:
        result.error = `unsupported_platform:${platform}`;
        return result;
    }
  } catch (e) {
    result.error = (e as Error).message.slice(0, 200);
    return result;
  }

  result.signalsDetected = rawSignals.length;

  for (const signal of rawSignals) {
    const processed = await processSignal(fanId, communityId, signal, rules);
    if (processed.rewarded) {
      result.signalsRewarded++;
      result.pointsAwarded += processed.pointsAwarded;
    }
  }

  updateLastScanned(fanId, platform);
  return result;
}

export async function scanCommunity(
  communityId: string,
  creatorId: string,
  maxFans = 50,
): Promise<{
  communityId: string;
  fansScanned: number;
  results: ScanResult[];
  totalSignals: number;
  totalRewarded: number;
  totalPoints: number;
}> {
  const db = getAuraDatabase();
  const fans = getFansInCommunity(communityId, maxFans, 0);

  const activePlatforms = [...new Set(
    getSignalRulesForCommunity(communityId).map(r => r.platform),
  )];

  const results: ScanResult[] = [];

  for (const fanData of fans) {
    const connectedPlatforms = (db.prepare(
      "SELECT platform FROM sf_fan_platform_accounts WHERE fan_id=? AND connected_status='connected'"
    ).all(fanData.id) as { platform: string }[]).map(r => r.platform as Platform);

    const toScan = connectedPlatforms.filter(p => activePlatforms.includes(p));

    for (const platform of toScan) {
      const res = await scanFan(fanData.id, communityId, creatorId, platform);
      results.push(res);
    }
  }

  return {
    communityId,
    fansScanned: fans.length,
    results,
    totalSignals: results.reduce((s, r) => s + r.signalsDetected, 0),
    totalRewarded: results.reduce((s, r) => s + r.signalsRewarded, 0),
    totalPoints: results.reduce((s, r) => s + r.pointsAwarded, 0),
  };
}
