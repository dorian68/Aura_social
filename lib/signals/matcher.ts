import type Database from "better-sqlite3";
import type { RawSignal, SignalRule } from "./types";

export function matchSignal(
  signal: RawSignal,
  rules: SignalRule[],
  db: Database.Database,
  fanId: string,
): SignalRule | null {
  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (rule.platform !== signal.platform) continue;
    if (rule.signalType !== signal.signalType) continue;

    if (rule.keywords.length > 0) {
      const text = (signal.contentText ?? "").toLowerCase();
      const matched = rule.keywords.some(k => text.includes(k.toLowerCase()));
      if (!matched) continue;
    }

    if (rule.maxPerFan != null) {
      const row = db.prepare(
        "SELECT COUNT(*) as c FROM sf_platform_signals WHERE fan_id=? AND matched_rule_id=? AND rewarded=1"
      ).get(fanId, rule.id) as { c: number };
      if (row.c >= rule.maxPerFan) continue;
    }

    if (rule.maxPerDay != null) {
      const row = db.prepare(
        "SELECT COUNT(*) as c FROM sf_platform_signals WHERE matched_rule_id=? AND DATE(detected_at)=DATE('now') AND rewarded=1"
      ).get(rule.id) as { c: number };
      if (row.c >= rule.maxPerDay) continue;
    }

    return rule;
  }
  return null;
}
