import { instagramGraphProvider } from "@/lib/providers/instagram/instagramGraphProvider";
import type { InstagramDataProvider } from "@/lib/providers/instagram/types";

export function getInstagramProvider(): InstagramDataProvider {
  return instagramGraphProvider;
}
