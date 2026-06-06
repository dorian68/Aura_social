import type {
  AnalyzedPost,
  CreatorPostInput,
  CreatorPostType,
  FormatPerformance,
  PostAnalysisResult,
} from "@/lib/analytics/types";
import { clamp, round, safeDivide } from "@/lib/analytics/formatters";

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function getConsistencyScore(values: number[]) {
  if (values.length < 2) return 50;
  const mean = average(values);
  if (!mean) return 50;
  const variance = average(values.map((value) => (value - mean) ** 2));
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  return Math.round(clamp(100 - coefficientOfVariation * 75));
}

function findTopPost(posts: AnalyzedPost[], metric: (post: AnalyzedPost) => number) {
  return posts.length
    ? posts.reduce((best, post) => (metric(post) > metric(best) ? post : best))
    : null;
}

export function analyzePosts(posts: CreatorPostInput[], followers: number): PostAnalysisResult {
  const analyzedPosts: AnalyzedPost[] = posts.map((post) => {
    const totalInteractions = post.likes + post.comments + post.saves + post.shares;
    return {
      ...post,
      totalInteractions,
      engagementRate: round(safeDivide(totalInteractions, followers) * 100),
      reelViewRate: post.type === "Reel" ? round(safeDivide(post.views ?? 0, followers) * 100) : 0,
    };
  });

  const formats: CreatorPostType[] = ["Image", "Carousel", "Reel"];
  const averageEngagementByFormat: FormatPerformance[] = formats
    .map((format) => {
      const matchingPosts = analyzedPosts.filter((post) => post.type === format);
      return {
        format,
        postCount: matchingPosts.length,
        averageEngagementRate: round(average(matchingPosts.map((post) => post.engagementRate))),
        averageInteractions: round(average(matchingPosts.map((post) => post.totalInteractions))),
      };
    })
    .filter((format) => format.postCount > 0);

  const bestFormat = averageEngagementByFormat.length
    ? averageEngagementByFormat.reduce((best, format) =>
        format.averageEngagementRate > best.averageEngagementRate ? format : best,
      ).format
    : null;
  const consistencyScore = getConsistencyScore(analyzedPosts.map((post) => post.engagementRate));
  const volatility =
    analyzedPosts.length < 2
      ? "Non mesurable"
      : consistencyScore >= 75
        ? "Faible"
        : consistencyScore >= 50
          ? "Modérée"
          : "Élevée";

  const insights: string[] = [];
  if (bestFormat) insights.push(`Le format ${bestFormat} génère le meilleur engagement moyen.`);
  if (volatility === "Élevée") {
    insights.push("Les performances varient fortement : identifiez les sujets des meilleurs posts et répétez leurs angles.");
  } else if (volatility === "Faible") {
    insights.push("Vos contenus ont des performances régulières, ce qui facilite la planification d’un lancement.");
  }
  const bestReel = findTopPost(
    analyzedPosts.filter((post) => post.type === "Reel"),
    (post) => post.reelViewRate,
  );
  if (bestReel && bestReel.reelViewRate >= 50) {
    insights.push("Vos meilleurs Reels touchent une part importante de votre audience : utilisez-les pour votre waitlist.");
  }

  return {
    posts: analyzedPosts,
    topPost: findTopPost(analyzedPosts, (post) => post.engagementRate),
    bestSavePost: findTopPost(analyzedPosts, (post) => post.saves),
    bestSharePost: findTopPost(analyzedPosts, (post) => post.shares),
    bestReel,
    bestFormat,
    averageEngagementByFormat,
    consistencyScore,
    volatility,
    totalHighIntentComments: analyzedPosts.reduce((total, post) => total + (post.highIntentComments ?? 0), 0),
    contentInsights: insights,
  };
}
