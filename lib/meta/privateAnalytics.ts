import { average, calculateEngagementRate, clamp, round, safeDivide, sum, toNumber } from "./utils";
import type { PrivateInsightsPayload } from "./types";

export function buildPrivateAnalytics({ profile, media, warnings = [] }: PrivateInsightsPayload) {
  const followers = toNumber(profile.followers_count);
  const normalizedMedia = media.map((post) => {
    const reach = toNumber(post.insights.reach);
    const impressions = toNumber(post.insights.impressions);
    const saves = toNumber(post.insights.saved);
    return {
      id: post.id,
      caption: post.caption,
      media_type: post.mediaType,
      media_url: post.mediaUrl,
      thumbnail_url: post.thumbnailUrl,
      permalink: post.permalink,
      timestamp: post.timestamp,
      like_count: toNumber(post.likeCount),
      comments_count: toNumber(post.commentsCount),
      reach,
      impressions,
      saves,
      save_rate: round(safeDivide(saves, reach) * 100, 2),
      engagement_rate: calculateEngagementRate(post.likeCount, post.commentsCount, followers),
      impression_to_reach_ratio: round(safeDivide(impressions, reach), 2),
      unavailable_metrics: post.unavailableMetrics || [],
    };
  });
  const totalReach = sum(normalizedMedia.map((post) => post.reach));
  const totalImpressions = sum(normalizedMedia.map((post) => post.impressions));
  const totalSaves = sum(normalizedMedia.map((post) => post.saves));
  const overview = {
    total_reach: totalReach,
    total_impressions: totalImpressions,
    total_saves: totalSaves,
    average_reach: round(average(normalizedMedia.map((post) => post.reach)), 2),
    average_impressions: round(average(normalizedMedia.map((post) => post.impressions)), 2),
    average_saves: round(average(normalizedMedia.map((post) => post.saves)), 2),
    average_engagement_rate: round(average(normalizedMedia.map((post) => post.engagement_rate)), 2),
    save_rate: round(safeDivide(totalSaves, totalReach) * 100, 2),
    reach_rate: followers ? round(safeDivide(totalReach, followers) * 100, 2) : null,
    impression_to_reach_ratio: round(safeDivide(totalImpressions, totalReach), 2),
  };
  const underperforming = findUnderperformingPosts(normalizedMedia, overview);
  const recommendations = generatePrivateRecommendations(overview, normalizedMedia, underperforming);

  return {
    profile,
    overview,
    media: normalizedMedia,
    best_posts: {
      top_post_by_reach: maxBy(normalizedMedia, "reach"),
      top_post_by_saves: maxBy(normalizedMedia, "saves"),
      top_post_by_save_rate: maxBy(normalizedMedia, "save_rate"),
    },
    underperforming_posts: underperforming,
    recommendations: recommendations.insights,
    action_plan: recommendations.actionPlan,
    warnings,
  };
}

function maxBy<T extends Record<string, unknown>>(items: T[], field: string) {
  if (!items.length) return null;
  return [...items].sort((a, b) => toNumber(b[field]) - toNumber(a[field]))[0];
}

function findUnderperformingPosts<T extends { reach: number; saves: number; engagement_rate: number }>(
  media: T[],
  overview: { average_reach: number; average_saves: number; average_engagement_rate: number },
) {
  return media
    .filter((post) => {
      const lowReach = post.reach && post.reach < overview.average_reach * 0.6;
      const lowSaves = post.saves < overview.average_saves * 0.5;
      const lowEngagement = post.engagement_rate < overview.average_engagement_rate * 0.7;
      return lowReach || lowSaves || lowEngagement;
    })
    .slice(0, 5);
}

function generatePrivateRecommendations(
  overview: { save_rate: number; reach_rate: number | null; average_engagement_rate: number; impression_to_reach_ratio: number },
  media: Array<{ like_count: number; comments_count: number; media_type: string }>,
  underperformingPosts: unknown[],
) {
  const averageLikes = average(media.map((post) => post.like_count));
  const averageComments = average(media.map((post) => post.comments_count));
  const commentToLikeRatio = safeDivide(averageComments, averageLikes);
  const insights: string[] = [];

  if (overview.save_rate >= 2) insights.push("Your content is useful or reference-worthy. Consider creating more educational or checklist-style posts.");
  if (commentToLikeRatio < 0.02 && averageLikes > 20) insights.push("Your audience reacts but does not converse. Add stronger questions or opinion-based captions.");
  if ((overview.reach_rate || 0) < 30 && overview.average_engagement_rate >= 2) insights.push("Your content resonates with existing followers but may lack discovery. Improve hooks, formats, and posting timing.");
  if (overview.impression_to_reach_ratio >= 1.5) insights.push("People are seeing your content multiple times. This may indicate strong relevance or repeat exposure.");
  if (underperformingPosts.length >= 3) insights.push("Several recent posts are underperforming. Compare their first line, format, and topic against your best posts.");
  if (!insights.length) insights.push("The latest posts show a balanced performance profile. Keep testing formats and captions to find stronger patterns.");

  const carouselShare = safeDivide(media.filter((post) => post.media_type === "CAROUSEL_ALBUM").length, media.length);
  const actionPlan = [
    {
      area: "Content format",
      recommendation: carouselShare < 0.3 ? "Test more carousel posts for educational, checklist, and before-after content." : "Double down on carousel topics that earn saves and profile visits.",
      priority: 90,
    },
    { area: "Posting consistency", recommendation: "Keep a repeatable posting cadence and compare each post against the same weekday/time window.", priority: 70 },
    {
      area: "Caption and CTA",
      recommendation: commentToLikeRatio < 0.03 ? "End captions with a specific question that invites opinions, not just agreement." : "Keep using direct CTAs and turn high-comment posts into recurring content series.",
      priority: 80,
    },
    { area: "Engagement", recommendation: "Reply quickly to early comments and reuse audience language in the next post hook.", priority: 70 },
    { area: "Conversion and community", recommendation: "Send high-save topics toward a newsletter, community, lead magnet, or product waitlist.", priority: 70 },
  ];

  return {
    insights,
    actionPlan: actionPlan.map((item) => ({ ...item, priority: clamp(item.priority, 0, 100) })),
  };
}
