import type { RawSignal } from "../types";

interface YouTubeItem {
  id: { videoId: string };
  snippet: { title: string; description: string; publishedAt: string };
}

export async function scanYouTube(params: {
  accessToken: string;
  lastScannedAt?: string;
}): Promise<RawSignal[]> {
  // Step 1: get the fan's YouTube channel ID
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
    { headers: { Authorization: `Bearer ${params.accessToken}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!channelRes.ok) throw new Error(`YouTube channels API ${channelRes.status}`);
  const channelData = await channelRes.json() as { items?: { id: string }[] };
  const channelId = channelData.items?.[0]?.id;
  if (!channelId) return [];

  // Step 2: list recent uploads
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("maxResults", "20");
  if (params.lastScannedAt) searchUrl.searchParams.set("publishedAfter", params.lastScannedAt);

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!searchRes.ok) throw new Error(`YouTube search API ${searchRes.status}`);
  const searchData = await searchRes.json() as { items?: YouTubeItem[] };

  return (searchData.items ?? []).map(item => ({
    platform: "youtube" as const,
    signalType: "video" as const,
    contentId: item.id.videoId,
    contentUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    contentText: `${item.snippet.title} ${item.snippet.description}`,
    detectedAt: item.snippet.publishedAt,
  }));
}
