import type { RawSignal } from "../types";

interface TikTokVideo {
  id: string;
  title?: string;
  create_time?: number;
  share_url?: string;
  description?: string;
}

export async function scanTikTok(params: {
  accessToken: string;
  lastScannedAt?: string;
}): Promise<RawSignal[]> {
  const res = await fetch("https://open.tiktokapis.com/v2/video/list/", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: ["id", "title", "create_time", "share_url", "description"],
      max_count: 20,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TikTok API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    data?: { videos?: TikTokVideo[] };
    error?: { code: string; message: string };
  };
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok: ${data.error.message}`);
  }

  const sinceMs = params.lastScannedAt ? new Date(params.lastScannedAt).getTime() : 0;

  return (data.data?.videos ?? [])
    .filter(v => sinceMs === 0 || (v.create_time && v.create_time * 1000 >= sinceMs))
    .map(v => ({
      platform: "tiktok" as const,
      signalType: "video" as const,
      contentId: v.id,
      contentUrl: v.share_url,
      contentText: [v.title, v.description].filter(Boolean).join(" "),
      detectedAt: v.create_time
        ? new Date(v.create_time * 1000).toISOString()
        : new Date().toISOString(),
    }));
}
