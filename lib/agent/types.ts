import type {
  AgentRecommendation,
  CampaignDraft,
  FanPass,
  FanSegment,
  LoyaltyProgram,
  LoyaltyProgramStats,
  LoyaltyState,
  Reward,
  TokenEconomy,
} from "@/lib/loyalty/types";

export type AgentMode = "rules" | "llm";

export interface AgentContext {
  program: LoyaltyProgram;
  stats: LoyaltyProgramStats;
  fanSegments: FanSegment[];
  rewards: Reward[];
  fanPasses: FanPass[];
  tokenEconomy: TokenEconomy;
  state: LoyaltyState;
}

export interface AgentRunResult {
  mode: AgentMode;
  recommendations: AgentRecommendation[];
  drafts: CampaignDraft[];
}
