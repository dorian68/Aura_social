import { createHmac } from "node:crypto";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { getSignalRulesForCommunity } from "@/lib/signals/scanner";
import { processSignal } from "@/lib/signals/processor";
import type { RawSignal } from "@/lib/signals/types";

export const runtime = "nodejs";

// Meta webhook verification handshake
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === (process.env.SIGNAL_WEBHOOK_SECRET ?? "aura_webhook_secret")) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return fail("FORBIDDEN", "Webhook verification failed", 403);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // Verify X-Hub-Signature-256
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const sig = req.headers.get("x-hub-signature-256") ?? "";
      const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
      if (sig !== expected) return fail("FORBIDDEN", "Invalid signature", 403);
    }

    const payload = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{
        id: string;
        time?: number;
        changes?: Array<{ field: string; value: { media_id?: string; text?: string; from?: { id: string } } }>;
      }>;
    };

    if (payload.object !== "instagram") return ok({ skipped: true });

    const db = getAuraDatabase();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "mentions" && change.field !== "comments") continue;

        const mediaId = change.value.media_id;
        const fromId = change.value.from?.id;
        const text = change.value.text ?? "";

        if (!mediaId || !fromId) continue;

        // Find fan by Instagram user ID stored in metadata
        const fanRow = db.prepare(
          "SELECT fan_id, community_id FROM sf_fan_platform_accounts WHERE platform='instagram' AND JSON_EXTRACT(metadata,'$.instagram_user_id')=? AND connected_status='connected'"
        ).get(fromId) as { fan_id: string; community_id?: string } | undefined;

        if (!fanRow) continue;

        // Find the communities this fan belongs to
        const memberships = db.prepare(
          "SELECT community_id FROM sf_memberships WHERE fan_id=?"
        ).all(fanRow.fan_id) as { community_id: string }[];

        const signal: RawSignal = {
          platform: "instagram",
          signalType: "post",
          contentId: mediaId,
          contentText: text,
          detectedAt: new Date().toISOString(),
        };

        for (const m of memberships) {
          const rules = getSignalRulesForCommunity(m.community_id)
            .filter(r => r.platform === "instagram");
          if (rules.length > 0) {
            await processSignal(fanRow.fan_id, m.community_id, signal, rules);
          }
        }
      }
    }

    return ok({ received: true });
  } catch (e) { return handleApiError(e); }
}
