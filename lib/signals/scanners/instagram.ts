import type { RawSignal } from "../types";

interface InstagramMedia {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  permalink?: string;
}

export async function scanInstagram(params: {
  accessToken: string;
  lastScannedAt?: string;
}): Promise<RawSignal[]> {
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,caption,timestamp,media_type,permalink");
  url.searchParams.set("access_token", params.accessToken);
  if (params.lastScannedAt) {
    url.searchParams.set("since", String(Math.floor(new Date(params.lastScannedAt).getTime() / 1000)));
  }

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: InstagramMedia[]; error?: { message: string } };
  if (data.error) throw new Error(`Instagram: ${data.error.message}`);

  return (data.data ?? []).map(m => ({
    platform: "instagram" as const,
    signalType: "post" as const,
    contentId: m.id,
    contentUrl: m.permalink,
    contentText: m.caption,
    detectedAt: m.timestamp || new Date().toISOString(),
  }));
}
