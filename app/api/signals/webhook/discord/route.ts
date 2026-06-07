import { createHmac, timingSafeEqual } from "node:crypto";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { getSignalRulesForCommunity } from "@/lib/signals/scanner";
import { processSignal } from "@/lib/signals/processor";
import type { RawSignal } from "@/lib/signals/types";

export const runtime = "nodejs";

// This endpoint is called by the Aura Discord bot whenever a message is detected.
// The bot signs the payload with DISCORD_WEBHOOK_SECRET to prevent spoofing.

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    const secret = process.env.DISCORD_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.headers.get("x-aura-signature") ?? "";
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      const sigBuf = Buffer.from(sig.padEnd(expected.length, "\0"));
      const expBuf = Buffer.from(expected);
      const matches = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
      if (!matches) return fail("FORBIDDEN", "Invalid Discord webhook signature", 403);
    }

    const payload = JSON.parse(rawBody) as {
      discordUserId: string;
      guildId: string;
      messageId: string;
      channelId?: string;
      content: string;
    };

    const { discordUserId, guildId, messageId, content } = payload;
    if (!discordUserId || !guildId || !messageId) {
      return fail("INVALID_PAYLOAD", "discordUserId, guildId, messageId are required", 400);
    }

    const db = getAuraDatabase();

    // Find fan by Discord user ID stored in platform metadata
    const fanRow = db.prepare(
      "SELECT fan_id FROM sf_fan_platform_accounts WHERE platform='discord' AND JSON_EXTRACT(metadata,'$.discord_user_id')=? AND connected_status='connected'"
    ).get(discordUserId) as { fan_id: string } | undefined;

    if (!fanRow) return ok({ received: true, matched: false, reason: "no_fan" });

    // Find the communities this fan belongs to (matching the Discord guild)
    const memberships = db.prepare(
      "SELECT m.community_id FROM sf_memberships m WHERE m.fan_id=?"
    ).all(fanRow.fan_id) as { community_id: string }[];

    if (memberships.length === 0) return ok({ received: true, matched: false, reason: "no_membership" });

    const signal: RawSignal = {
      platform: "discord",
      signalType: "message",
      contentId: messageId,
      contentText: content,
      detectedAt: new Date().toISOString(),
      metadata: { guildId, discordUserId },
    };

    const processed: Array<{ communityId: string; rewarded: boolean; points: number }> = [];

    for (const m of memberships) {
      const rules = getSignalRulesForCommunity(m.community_id)
        .filter(r => r.platform === "discord");
      if (rules.length > 0) {
        const result = await processSignal(fanRow.fan_id, m.community_id, signal, rules);
        processed.push({ communityId: m.community_id, rewarded: result.rewarded, points: result.pointsAwarded });
      }
    }

    return ok({ received: true, matched: true, processed });
  } catch (e) { return handleApiError(e); }
}
