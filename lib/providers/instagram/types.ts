import type { CreatorAnalysisInput } from "@/lib/analytics/types";

export interface InstagramDataProvider {
  readonly id: string;
  collect(username: string): Promise<CreatorAnalysisInput>;
}

export type InstagramProviderErrorCode =
  | "CONFIGURATION_ERROR"
  | "PROFILE_NOT_FOUND"
  | "PROVIDER_ERROR";

export class InstagramProviderError extends Error {
  constructor(
    message: string,
    readonly code: InstagramProviderErrorCode,
  ) {
    super(message);
    this.name = "InstagramProviderError";
  }
}
