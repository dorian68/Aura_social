export const creatorNiches = [
  "Fitness",
  "Beauty",
  "Finance",
  "Food",
  "Lifestyle",
  "Gaming",
  "Education",
  "Music",
  "Other",
] as const;

export const creatorGoals = [
  "vendre une formation",
  "vendre une communauté privée",
  "vendre du contenu premium",
  "lancer un token de fidélité",
  "vendre des produits physiques",
  "générer plus de leads",
] as const;

export const creatorPostTypes = ["Image", "Carousel", "Reel"] as const;

export type CreatorNiche = (typeof creatorNiches)[number];
export type CreatorGoal = (typeof creatorGoals)[number];
export type CreatorPostType = (typeof creatorPostTypes)[number];

export type CreatorPostInput = {
  id: string;
  type: CreatorPostType;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  views?: number;
  publishedAt: string;
  caption: string;
  highIntentComments?: number;
};

export type CreatorAnalysisInput = {
  username: string;
  followers: number;
  postsAnalyzed: number;
  averageLikes: number;
  averageComments: number;
  averageShares?: number;
  averageSaves?: number;
  averageReelViews?: number;
  bioLinkClicks?: number;
  estimatedDMs?: number;
  niche: CreatorNiche;
  goal: CreatorGoal;
  posts: CreatorPostInput[];
};

export type CreatorMetrics = {
  engagementRate: number;
  advancedEngagementRate: number;
  commentToLikeRatio: number;
  saveRate: number;
  shareRate: number;
  reelViewRate: number;
  bioLinkClickRate: number;
};

export type ScoreBreakdown = {
  engagementRateScore: number;
  commentsQualityScore: number;
  savesSharesScore: number;
  messageIntentScore: number;
  consistencyScore: number;
};

export type TokenReadinessBreakdown = {
  audienceScore: number;
  engagementScore: number;
  superfanScore: number;
  nicheScore: number;
  intentScore: number;
  consistencyScore: number;
};

export type CreatorScores = {
  superfanScore: number;
  tokenReadinessScore: number;
  superfanBreakdown: ScoreBreakdown;
  tokenReadinessBreakdown: TokenReadinessBreakdown;
};

export type RevenueScenario = {
  label: "Prudent" | "Réaliste" | "Ambitieux";
  conversionRate: number;
  vipFans: number;
  arpu: number;
  annualRevenue: number;
  monthlyRevenue: number;
};

export type RevenuePotential = {
  conservative: RevenueScenario;
  realistic: RevenueScenario;
  ambitious: RevenueScenario;
};

export type AnalyzedPost = CreatorPostInput & {
  totalInteractions: number;
  engagementRate: number;
  reelViewRate: number;
};

export type FormatPerformance = {
  format: CreatorPostType;
  postCount: number;
  averageEngagementRate: number;
  averageInteractions: number;
};

export type PostAnalysisResult = {
  posts: AnalyzedPost[];
  topPost: AnalyzedPost | null;
  bestSavePost: AnalyzedPost | null;
  bestSharePost: AnalyzedPost | null;
  bestReel: AnalyzedPost | null;
  bestFormat: CreatorPostType | null;
  averageEngagementByFormat: FormatPerformance[];
  consistencyScore: number;
  volatility: "Faible" | "Modérée" | "Élevée" | "Non mesurable";
  totalHighIntentComments: number;
  contentInsights: string[];
};

export type RecommendationPriority = "high" | "medium" | "opportunity" | "risk";

export type Recommendation = {
  id: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
};

export type CreatorDiagnostics = {
  engagementQuality: string;
  superfanIntensity: string;
  tokenMaturity: string;
  monetizationPotential: string;
};

export type CreatorAnalysisReport = {
  profile: {
    username: string;
    followers: number;
    postsAnalyzed: number;
    niche: CreatorNiche;
    goal: CreatorGoal;
  };
  metrics: CreatorMetrics;
  scores: CreatorScores;
  revenue: RevenuePotential;
  postAnalysis: PostAnalysisResult;
  recommendations: Recommendation[];
  diagnostics: CreatorDiagnostics;
  meta: {
    analyzedAt: string;
    source: string;
    version: string;
  };
};

export type ValidationIssue = {
  path: string;
  message: string;
};
