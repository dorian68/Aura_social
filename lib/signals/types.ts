import type { Platform } from "@/lib/superfan/types";

export type SignalType = "post" | "story" | "video" | "comment" | "clip" | "raid" | "message";

export interface RawSignal {
  platform: Platform;
  signalType: SignalType;
  contentId: string;
  contentUrl?: string;
  contentText?: string;
  detectedAt: string;
  metadata?: Record<string, unknown>;
}

export interface SignalRule {
  id: string;
  communityId: string;
  challengeId?: string;
  platform: Platform;
  signalType: SignalType;
  keywords: string[];
  pointsReward: number;
  maxPerFan?: number;
  maxPerDay?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSignal {
  id: string;
  fanId: string;
  communityId: string;
  platform: Platform;
  signalType: SignalType;
  contentId: string;
  contentUrl?: string;
  contentText?: string;
  matchedRuleId?: string;
  rewarded: boolean;
  pointsAwarded: number;
  detectedAt: string;
  rewardedAt?: string;
}

export interface ScanResult {
  fanId: string;
  platform: Platform;
  signalsDetected: number;
  signalsRewarded: number;
  pointsAwarded: number;
  error?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
}
