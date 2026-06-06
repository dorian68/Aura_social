import {
  AppError,
  average,
  buildPublicScore,
  calculateEngagementRate,
  clamp,
  round,
  safeDivide,
  sanitizeUsername,
  sum,
  toNumber,
} from "./utils.js";

export async function getPublicEstimate(metaClient, rawUsername) {
  const username = sanitizeUsername(rawUsername);

  let response;
  try {
    response = await metaClient.fetchBusinessDiscovery(username);
  } catch (error) {
    if (error.code?.startsWith("META_")) {
      throw new AppError(
        "PUBLIC_ACCOUNT_UNAVAILABLE",
        "This account could not be fetched through Meta Business Discovery.",
        error.status || 502,
        "The account may be private, personal, unavailable, unsupported by Meta API, or blocked by missing permissions.",
      );
    }
    throw error;
  }

  const account = response?.business_discovery;
  if (!account?.username) {
    throw new AppError(
      "PUBLIC_ACCOUNT_UNAVAILABLE",
      "This account could not be fetched through Meta Business Discovery.",
      404,
      "The account may be private, personal, unavailable, unsupported by Meta API, or blocked by missing permissions.",
    );
  }

  return normalizePublicEstimate(account);
}

export function normalizePublicEstimate(account) {
  const followers = toNumber(account.followers_count);
  const media = Array.isArray(account.media?.data) ? account.media.data : [];
  const posts = media.map((post) => normalizePublicPost(post, followers));
  const averageLikes = round(average(posts.map((post) => post.like_count)), 2);
  const averageComments = round(average(posts.map((post) => post.comments_count)), 2);
  const averageInteractions = round(averageLikes + averageComments, 2);
  const averageEngagementRate = calculateEngagementRate(averageLikes, averageComments, followers);
  const postingFrequencyEstimate = estimatePostingFrequency(posts);
  const publicScore = buildPublicScore({
    averageEngagementRate,
    postingFrequencyEstimate,
    postsAnalyzed: posts.length,
    averageLikes,
    averageComments,
  });

  return {
    profile: {
      username: account.username,
      name: account.name || account.username,
      profile_picture_url: account.profile_picture_url || "",
      followers_count: followers,
      media_count: toNumber(account.media_count),
    },
    analyzed_posts_count: posts.length,
    average_likes: averageLikes,
    average_comments: averageComments,
    average_interactions: averageInteractions,
    average_engagement_rate: averageEngagementRate,
    best_post_by_engagement: pickPost(posts, "best"),
    worst_post_by_engagement: pickPost(posts, "worst"),
    engagement_distribution: buildEngagementDistribution(posts),
    posting_frequency_estimate: postingFrequencyEstimate,
    content_type_breakdown: buildContentTypeBreakdown(posts),
    caption_length_average: round(average(posts.map((post) => post.caption_length)), 1),
    posts_without_caption_count: posts.filter((post) => !post.caption).length,
    public_score: publicScore,
    interpretation: interpretPublicEngagement(averageEngagementRate, posts.length),
    posts,
  };
}

function normalizePublicPost(post, followers) {
  const likes = toNumber(post.like_count);
  const comments = toNumber(post.comments_count);
  const caption = typeof post.caption === "string" ? post.caption.trim() : "";

  return {
    id: post.id,
    caption,
    caption_length: caption.length,
    media_type: post.media_type || "UNKNOWN",
    like_count: likes,
    comments_count: comments,
    timestamp: post.timestamp || "",
    permalink: post.permalink || "",
    engagement_rate: calculateEngagementRate(likes, comments, followers),
  };
}

function pickPost(posts, mode) {
  if (!posts.length) return null;
  const sorted = [...posts].sort((a, b) => a.engagement_rate - b.engagement_rate);
  return mode === "best" ? sorted[sorted.length - 1] : sorted[0];
}

function buildEngagementDistribution(posts) {
  return posts.reduce(
    (distribution, post) => {
      if (post.engagement_rate >= 3) distribution.strong += 1;
      else if (post.engagement_rate >= 1) distribution.average += 1;
      else distribution.low += 1;
      return distribution;
    },
    { strong: 0, average: 0, low: 0 },
  );
}

function estimatePostingFrequency(posts) {
  const timestamps = posts
    .map((post) => new Date(post.timestamp).getTime())
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((a, b) => b - a);

  if (timestamps.length < 2) {
    return {
      label: "Not enough public data",
      posts_per_week: 0,
      average_gap_days: null,
      analyzed_days_span: null,
    };
  }

  const newest = timestamps[0];
  const oldest = timestamps[timestamps.length - 1];
  const spanDays = Math.max(1, (newest - oldest) / (24 * 60 * 60 * 1000));
  const postsPerWeek = round((timestamps.length / spanDays) * 7, 2);
  const averageGapDays = round(spanDays / Math.max(1, timestamps.length - 1), 1);

  let label = "Low consistency";
  if (postsPerWeek >= 3) label = "Consistent";
  else if (postsPerWeek >= 1) label = "Moderate consistency";

  return {
    label,
    posts_per_week: postsPerWeek,
    average_gap_days: averageGapDays,
    analyzed_days_span: round(spanDays, 1),
  };
}

function buildContentTypeBreakdown(posts) {
  return posts.reduce(
    (breakdown, post) => {
      const type = post.media_type || "UNKNOWN";
      if (type in breakdown) breakdown[type] += 1;
      else breakdown[type] = (breakdown[type] || 0) + 1;
      return breakdown;
    },
    {
      IMAGE: 0,
      VIDEO: 0,
      CAROUSEL_ALBUM: 0,
      REELS: 0,
    },
  );
}

function interpretPublicEngagement(averageEngagementRate, postsAnalyzed) {
  if (postsAnalyzed < 3) return "Not enough public data";
  if (averageEngagementRate >= 3) return "Strong engagement";
  if (averageEngagementRate >= 1) return "Average engagement";
  return "Low engagement";
}

export function buildPrivateAnalytics({ profile, media, warnings = [] }) {
  const followers = toNumber(profile.followers_count);
  const normalizedMedia = media.map((post) => normalizePrivatePost(post, followers));
  const totalReach = sum(normalizedMedia.map((post) => post.reach));
  const totalImpressions = sum(normalizedMedia.map((post) => post.impressions));
  const totalSaves = sum(normalizedMedia.map((post) => post.saves));
  const averageEngagementRate = round(
    average(normalizedMedia.map((post) => post.engagement_rate)),
    2,
  );

  const overview = {
    total_reach: totalReach,
    total_impressions: totalImpressions,
    total_saves: totalSaves,
    average_reach: round(average(normalizedMedia.map((post) => post.reach)), 2),
    average_impressions: round(average(normalizedMedia.map((post) => post.impressions)), 2),
    average_saves: round(average(normalizedMedia.map((post) => post.saves)), 2),
    average_engagement_rate: averageEngagementRate,
    save_rate: round(safeDivide(totalSaves, totalReach) * 100, 2),
    reach_rate: followers ? round(safeDivide(totalReach, followers) * 100, 2) : null,
    impression_to_reach_ratio: round(safeDivide(totalImpressions, totalReach), 2),
  };

  const bestPosts = {
    top_post_by_reach: maxBy(normalizedMedia, "reach"),
    top_post_by_saves: maxBy(normalizedMedia, "saves"),
    top_post_by_save_rate: maxBy(normalizedMedia, "save_rate"),
  };

  const underperformingPosts = findUnderperformingPosts(normalizedMedia, overview);
  const recommendations = generateRecommendations({
    overview,
    media: normalizedMedia,
    underperformingPosts,
  });

  return {
    profile: {
      id: profile.id,
      username: profile.username || "",
      name: profile.name || profile.username || "Instagram account",
      profile_picture_url: profile.profile_picture_url || "",
      followers_count: followers,
      media_count: toNumber(profile.media_count),
    },
    overview,
    media: normalizedMedia,
    best_posts: bestPosts,
    underperforming_posts: underperformingPosts,
    recommendations: recommendations.insights,
    action_plan: recommendations.actionPlan,
    warnings,
  };
}

function normalizePrivatePost(post, followers) {
  const reach = toNumber(post.insights?.reach);
  const impressions = toNumber(post.insights?.impressions);
  const saves = toNumber(post.insights?.saved);
  const likes = toNumber(post.likeCount);
  const comments = toNumber(post.commentsCount);

  return {
    id: post.id,
    caption: post.caption,
    media_type: post.mediaType,
    media_url: post.mediaUrl,
    thumbnail_url: post.thumbnailUrl,
    permalink: post.permalink,
    timestamp: post.timestamp,
    like_count: likes,
    comments_count: comments,
    reach,
    impressions,
    saves,
    save_rate: round(safeDivide(saves, reach) * 100, 2),
    engagement_rate: calculateEngagementRate(likes, comments, followers),
    impression_to_reach_ratio: round(safeDivide(impressions, reach), 2),
    unavailable_metrics: post.unavailableMetrics || [],
  };
}

function maxBy(items, field) {
  if (!items.length) return null;
  return [...items].sort((a, b) => toNumber(b[field]) - toNumber(a[field]))[0];
}

function findUnderperformingPosts(media, overview) {
  const averageReach = overview.average_reach || 0;
  const averageSaves = overview.average_saves || 0;
  const averageEngagementRate = overview.average_engagement_rate || 0;

  return media
    .filter((post) => {
      const lowReach = post.reach && post.reach < averageReach * 0.6;
      const lowSaves = post.saves < averageSaves * 0.5;
      const lowEngagement = post.engagement_rate < averageEngagementRate * 0.7;
      return lowReach || lowSaves || lowEngagement;
    })
    .slice(0, 5);
}

export function generateRecommendations({ overview, media, underperformingPosts }) {
  const averageLikes = average(media.map((post) => post.like_count));
  const averageComments = average(media.map((post) => post.comments_count));
  const commentToLikeRatio = safeDivide(averageComments, averageLikes);
  const insights = [];

  if (overview.save_rate >= 2) {
    insights.push(
      "Your content is useful or reference-worthy. Consider creating more educational or checklist-style posts.",
    );
  }

  if (commentToLikeRatio < 0.02 && averageLikes > 20) {
    insights.push(
      "Your audience reacts but does not converse. Add stronger questions or opinion-based captions.",
    );
  }

  if ((overview.reach_rate || 0) < 30 && overview.average_engagement_rate >= 2) {
    insights.push(
      "Your content resonates with existing followers but may lack discovery. Improve hooks, formats, and posting timing.",
    );
  }

  if (overview.impression_to_reach_ratio >= 1.5) {
    insights.push(
      "People are seeing your content multiple times. This may indicate strong relevance or repeat exposure.",
    );
  }

  if (underperformingPosts.length >= 3) {
    insights.push(
      "Several recent posts are underperforming. Compare their first line, format, and topic against your best posts.",
    );
  }

  if (!insights.length) {
    insights.push(
      "The latest posts show a balanced performance profile. Keep testing formats and captions to find stronger patterns.",
    );
  }

  const carouselShare = safeDivide(
    media.filter((post) => post.media_type === "CAROUSEL_ALBUM").length,
    media.length,
  );

  const actionPlan = [
    {
      area: "Content format",
      recommendation:
        carouselShare < 0.3
          ? "Test more carousel posts for educational, checklist, and before-after content."
          : "Double down on carousel topics that earn saves and profile visits.",
    },
    {
      area: "Posting consistency",
      recommendation:
        "Keep a repeatable posting cadence and compare each post against the same weekday/time window.",
    },
    {
      area: "Caption and CTA",
      recommendation:
        commentToLikeRatio < 0.03
          ? "End captions with a specific question that invites opinions, not just agreement."
          : "Keep using direct CTAs and turn high-comment posts into recurring content series.",
    },
    {
      area: "Engagement",
      recommendation:
        "Reply quickly to early comments and reuse audience language in the next post hook.",
    },
    {
      area: "Conversion and community",
      recommendation:
        "Send high-save topics toward a newsletter, community, lead magnet, or product waitlist.",
    },
  ];

  return {
    insights,
    actionPlan: actionPlan.map((item) => ({
      ...item,
      priority: clamp(
        item.area === "Content format" ? 90 : item.area === "Caption and CTA" ? 80 : 70,
        0,
        100,
      ),
    })),
  };
}
