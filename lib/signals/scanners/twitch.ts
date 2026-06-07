import type { RawSignal } from "../types";

interface TwitchClip {
  id: string;
  creator_id: string;
  title: string;
  url: string;
  created_at: string;
}

export async function scanTwitch(params: {
  fanAccessToken: string;
  creatorBroadcasterId: string;
  fanTwitchUserId: string;
  lastScannedAt?: string;
}): Promise<RawSignal[]> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) throw new Error("TWITCH_CLIENT_ID not configured");

  const url = new URL("https://api.twitch.tv/helix/clips");
  url.searchParams.set("broadcaster_id", params.creatorBroadcasterId);
  url.searchParams.set("first", "20");
  if (params.lastScannedAt) url.searchParams.set("started_at", params.lastScannedAt);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.fanAccessToken}`,
      "Client-Id": clientId,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twitch clips API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: TwitchClip[] };

  return (data.data ?? [])
    .filter(clip => clip.creator_id === params.fanTwitchUserId)
    .map(clip => ({
      platform: "twitch" as const,
      signalType: "clip" as const,
      contentId: clip.id,
      contentUrl: clip.url,
      contentText: clip.title,
      detectedAt: clip.created_at,
    }));
}
