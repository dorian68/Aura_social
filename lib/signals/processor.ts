import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import {
  uid, now, awardPoints, createCompletion, updateCompletionStatus,
  getChallengeById, getCompletion,
} from "@/lib/superfan/db";
import type { TxSource } from "@/lib/superfan/types";
import type { RawSignal, SignalRule, PlatformSignal } from "./types";
import { matchSignal } from "./matcher";

export async function processSignal(
  fanId: string,
  communityId: string,
  signal: RawSignal,
  rules: SignalRule[],
): Promise<{ signal: PlatformSignal; rewarded: boolean; pointsAwarded: number }> {
  const db = getAuraDatabase();
  const signalId = uid();
  const matchedRule = matchSignal(signal, rules, db, fanId);

  // Dedup guard: INSERT OR IGNORE
  const result = db.prepare(`
    INSERT OR IGNORE INTO sf_platform_signals
    (id,fan_id,community_id,platform,signal_type,content_id,content_url,content_text,
     matched_rule_id,rewarded,points_awarded,detected_at)
    VALUES (?,?,?,?,?,?,?,?,?,0,0,?)
  `).run(
    signalId, fanId, communityId, signal.platform, signal.signalType, signal.contentId,
    signal.contentUrl ?? null, signal.contentText ?? null,
    matchedRule?.id ?? null, signal.detectedAt,
  );

  // Already seen — return existing row without re-rewarding
  if (result.changes === 0) {
    const existing = db.prepare(
      "SELECT * FROM sf_platform_signals WHERE fan_id=? AND platform=? AND content_id=?"
    ).get(fanId, signal.platform, signal.contentId) as Record<string, unknown>;
    return { signal: mapSignal(existing), rewarded: Boolean(existing.rewarded), pointsAwarded: Number(existing.points_awarded) };
  }

  if (!matchedRule) {
    const row = db.prepare("SELECT * FROM sf_platform_signals WHERE id=?").get(signalId) as Record<string, unknown>;
    return { signal: mapSignal(row), rewarded: false, pointsAwarded: 0 };
  }

  const source = `${signal.platform}_signal` as TxSource;
  awardPoints(fanId, communityId, matchedRule.pointsReward, source, signalId,
    `${signal.signalType} ${signal.platform} détecté`);

  db.prepare("UPDATE sf_platform_signals SET rewarded=1,points_awarded=?,rewarded_at=? WHERE id=?")
    .run(matchedRule.pointsReward, now(), signalId);

  // Auto-validate linked challenge if any
  if (matchedRule.challengeId) {
    const challenge = getChallengeById(matchedRule.challengeId);
    if (challenge?.status === "active") {
      const existing = getCompletion(matchedRule.challengeId, fanId);
      if (!existing) {
        const completion = createCompletion({ challengeId: matchedRule.challengeId, fanId, communityId });
        updateCompletionStatus(completion.id, "approved", "signal_auto");
      }
    }
  }

  const row = db.prepare("SELECT * FROM sf_platform_signals WHERE id=?").get(signalId) as Record<string, unknown>;
  return { signal: mapSignal(row), rewarded: true, pointsAwarded: matchedRule.pointsReward };
}

function mapSignal(r: Record<string, unknown>): PlatformSignal {
  return {
    id: String(r.id), fanId: String(r.fan_id), communityId: String(r.community_id),
    platform: r.platform as PlatformSignal["platform"],
    signalType: r.signal_type as PlatformSignal["signalType"],
    contentId: String(r.content_id),
    contentUrl: (r.content_url as string) || undefined,
    contentText: (r.content_text as string) || undefined,
    matchedRuleId: (r.matched_rule_id as string) || undefined,
    rewarded: Boolean(r.rewarded), pointsAwarded: Number(r.points_awarded),
    detectedAt: String(r.detected_at), rewardedAt: (r.rewarded_at as string) || undefined,
  };
}
