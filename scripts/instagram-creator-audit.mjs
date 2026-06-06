#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const DEFAULT_GRAPH_VERSION = "v23.0";
const DEFAULT_OUTPUT_DIR = "data/instagram";
const DEFAULT_POST_LIMIT = 100;
const DEFAULT_DAYS = 30;

const PROFILE_FIELDS = [
  "id",
  "username",
  "name",
  "biography",
  "followers_count",
  "follows_count",
  "media_count",
  "profile_picture_url",
  "website",
].join(",");

const MEDIA_FIELDS = [
  "id",
  "caption",
  "comments_count",
  "like_count",
  "media_product_type",
  "media_type",
  "media_url",
  "permalink",
  "shortcode",
  "thumbnail_url",
  "timestamp",
].join(",");

const USER_INSIGHT_GROUPS = [
  ["follower_count"],
  ["reach", "profile_views", "website_clicks"],
  ["views", "accounts_engaged", "total_interactions", "likes", "comments", "shares", "saves"],
];

const MEDIA_INSIGHT_GROUPS = [
  ["reach", "views", "likes", "comments", "shares", "saved", "saves", "total_interactions"],
  ["plays", "video_views"],
];

function loadDotEnv() {
  const envPath = join(projectRoot, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {
    graphVersion: process.env.INSTAGRAM_GRAPH_VERSION || DEFAULT_GRAPH_VERSION,
    igUserId: process.env.INSTAGRAM_IG_USER_ID || "",
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
    outputDir: process.env.INSTAGRAM_AUDIT_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
    limit: Number(process.env.INSTAGRAM_AUDIT_POST_LIMIT || DEFAULT_POST_LIMIT),
    username: "",
    since: "",
    until: "",
    days: Number(process.env.INSTAGRAM_AUDIT_DAYS || DEFAULT_DAYS),
    includeMediaInsights: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--ig-user-id" && next) {
      args.igUserId = next;
      index += 1;
    } else if (arg === "--access-token" && next) {
      args.accessToken = next;
      index += 1;
    } else if (arg === "--graph-version" && next) {
      args.graphVersion = next;
      index += 1;
    } else if (arg === "--username" && next) {
      args.username = cleanUsername(next);
      index += 1;
    } else if (arg === "--since" && next) {
      args.since = next;
      index += 1;
    } else if (arg === "--until" && next) {
      args.until = next;
      index += 1;
    } else if (arg === "--days" && next) {
      args.days = Number(next);
      index += 1;
    } else if (arg === "--limit" && next) {
      args.limit = Number(next);
      index += 1;
    } else if (arg === "--out" && next) {
      args.outputDir = next;
      index += 1;
    } else if (arg === "--skip-media-insights") {
      args.includeMediaInsights = false;
    } else {
      throw new Error(`Option inconnue: ${arg}`);
    }
  }

  args.limit = clampInteger(args.limit, 1, 500, DEFAULT_POST_LIMIT);
  args.days = clampInteger(args.days, 1, 90, DEFAULT_DAYS);
  return args;
}

function cleanUsername(username) {
  return username.replace(/^@+/, "").trim();
}

function clampInteger(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function printHelp() {
  console.log(`
Instagram creator audit

Usage:
  npm run instagram:audit -- --ig-user-id <IG_USER_ID> --access-token <TOKEN>

Options:
  --username <username>       Verifie que le compte connecte correspond au username attendu
  --since YYYY-MM-DD          Debut des insights compte
  --until YYYY-MM-DD          Fin des insights compte
  --days <n>                  Fenetre par defaut si --since est absent, max 90, defaut 30
  --limit <n>                 Nombre max de posts a analyser, max 500, defaut 100
  --out <dir>                 Dossier de sortie, defaut data/instagram
  --graph-version <version>   Version Graph API, defaut ${DEFAULT_GRAPH_VERSION}
  --skip-media-insights       Garde likes/commentaires mais evite les appels insights par post

Variables .env supportees:
  INSTAGRAM_ACCESS_TOKEN
  INSTAGRAM_IG_USER_ID
  INSTAGRAM_GRAPH_VERSION
  INSTAGRAM_AUDIT_OUTPUT_DIR
  INSTAGRAM_AUDIT_POST_LIMIT
  INSTAGRAM_AUDIT_DAYS
`);
}

function isoDateToUnixSeconds(date) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Date invalide: ${date}. Format attendu: YYYY-MM-DD`);
  }
  return Math.floor(parsed.getTime() / 1000);
}

function buildDateRange(args) {
  const untilDate = args.until ? new Date(`${args.until}T23:59:59.999Z`) : new Date();
  if (Number.isNaN(untilDate.getTime())) {
    throw new Error(`Date invalide: ${args.until}. Format attendu: YYYY-MM-DD`);
  }

  const sinceSeconds = args.since
    ? isoDateToUnixSeconds(args.since)
    : Math.floor((untilDate.getTime() - args.days * 24 * 60 * 60 * 1000) / 1000);
  const untilSeconds = Math.floor(untilDate.getTime() / 1000);

  if (sinceSeconds >= untilSeconds) {
    throw new Error("--since doit etre avant --until.");
  }

  return { since: sinceSeconds, until: untilSeconds };
}

class GraphApiClient {
  constructor({ accessToken, graphVersion }) {
    this.accessToken = accessToken;
    this.baseUrl = `https://graph.facebook.com/${graphVersion}`;
  }

  async get(path, params = {}) {
    const endpoint = new URL(`${this.baseUrl}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        endpoint.searchParams.set(key, String(value));
      }
    }
    endpoint.searchParams.set("access_token", this.accessToken);

    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message || `Graph API HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }
}

async function fetchPaged(client, path, params, maxItems) {
  const items = [];
  let page = await client.get(path, params);

  while (Array.isArray(page.data)) {
    items.push(...page.data);
    if (items.length >= maxItems || !page.paging?.next) break;

    const response = await fetch(page.paging.next, { headers: { Accept: "application/json" } });
    page = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = page?.error?.message || `Graph API pagination HTTP ${response.status}`;
      throw new Error(message);
    }
  }

  return items.slice(0, maxItems);
}

async function fetchInsightGroups(client, nodeId, groups, params, warnings) {
  const insights = {};

  for (const group of groups) {
    try {
      const response = await client.get(`${nodeId}/insights`, {
        ...params,
        metric: group.join(","),
      });
      mergeInsights(insights, response.data);
    } catch (groupError) {
      for (const metric of group) {
        try {
          const response = await client.get(`${nodeId}/insights`, {
            ...params,
            metric,
          });
          mergeInsights(insights, response.data);
        } catch (metricError) {
          warnings.push(`Metric ignoree pour ${nodeId}: ${metric} (${metricError.message})`);
        }
      }
    }
  }

  return insights;
}

function mergeInsights(target, rows) {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (!row?.name) continue;
    target[row.name] = normalizeInsight(row);
  }
}

function normalizeInsight(row) {
  const values = Array.isArray(row.values) ? row.values : [];
  const latest = values.length ? values[values.length - 1]?.value : row.value;
  return {
    name: row.name,
    title: row.title || row.name,
    description: row.description || "",
    period: row.period || "",
    latest,
    values: values.map((value) => ({
      endTime: value.end_time || value.endTime || null,
      value: value.value ?? null,
    })),
  };
}

function latestInsightNumber(insights, ...metricNames) {
  for (const metricName of metricNames) {
    const value = insights?.[metricName]?.latest;
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function sumInsightValues(insights, ...metricNames) {
  for (const metricName of metricNames) {
    const metric = insights?.[metricName];
    if (!metric) continue;

    if (Array.isArray(metric.values) && metric.values.length) {
      return metric.values.reduce((sum, row) => {
        const value = row.value;
        return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
      }, 0);
    }
    if (typeof metric.latest === "number" && Number.isFinite(metric.latest)) return metric.latest;
  }
  return 0;
}

function normalizePost(media, mediaInsights, followers) {
  const likes = numberOrZero(media.like_count);
  const comments = numberOrZero(media.comments_count);
  const saves = latestInsightNumber(mediaInsights, "saved", "saves");
  const shares = latestInsightNumber(mediaInsights, "shares");
  const views = latestInsightNumber(mediaInsights, "views", "plays", "video_views");
  const reach = latestInsightNumber(mediaInsights, "reach");
  const totalInteractions =
    latestInsightNumber(mediaInsights, "total_interactions") || likes + comments + saves + shares;

  return {
    id: media.id,
    shortcode: media.shortcode || "",
    permalink: media.permalink || "",
    type: media.media_type || "",
    productType: media.media_product_type || "",
    caption: typeof media.caption === "string" ? media.caption : "",
    publishedAt: media.timestamp || "",
    likes,
    comments,
    saves,
    shares,
    views,
    reach,
    totalInteractions,
    engagementRate: followers > 0 ? roundPercent(totalInteractions / followers) : 0,
    rawInsights: mediaInsights,
  };
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundPercent(value) {
  return Math.round(value * 10000) / 100;
}

function average(values) {
  const validValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!validValues.length) return 0;
  return Math.round((validValues.reduce((sum, value) => sum + value, 0) / validValues.length) * 100) / 100;
}

function sum(values) {
  return values.reduce((total, value) => total + numberOrZero(value), 0);
}

function buildAggregates(profile, posts, accountInsights, history) {
  const followers = numberOrZero(profile.followers_count);
  const totalInteractions = sum(posts.map((post) => post.totalInteractions));
  const previousSnapshot = history.length > 1 ? history[history.length - 2] : null;

  return {
    followers,
    following: numberOrZero(profile.follows_count),
    mediaCount: numberOrZero(profile.media_count),
    followersDeltaSincePreviousSnapshot: previousSnapshot
      ? followers - numberOrZero(previousSnapshot.followers)
      : null,
    followersDelta7d: deltaFromHistory(history, followers, 7),
    followersDelta30d: deltaFromHistory(history, followers, 30),
    postsAnalyzed: posts.length,
    totalLikes: sum(posts.map((post) => post.likes)),
    totalComments: sum(posts.map((post) => post.comments)),
    totalSaves: sum(posts.map((post) => post.saves)),
    totalShares: sum(posts.map((post) => post.shares)),
    totalViews: sum(posts.map((post) => post.views)),
    totalReachFromPosts: sum(posts.map((post) => post.reach)),
    totalInteractions,
    averageLikes: average(posts.map((post) => post.likes)),
    averageComments: average(posts.map((post) => post.comments)),
    averageSaves: average(posts.map((post) => post.saves)),
    averageShares: average(posts.map((post) => post.shares)),
    averageViews: average(posts.map((post) => post.views)),
    averageEngagementRate: average(posts.map((post) => post.engagementRate)),
    accountReachInRange: sumInsightValues(accountInsights, "reach"),
    accountViewsInRange: sumInsightValues(accountInsights, "views"),
    accountInteractionsInRange: sumInsightValues(accountInsights, "total_interactions", "accounts_engaged"),
    profileViewsInRange: sumInsightValues(accountInsights, "profile_views"),
    websiteClicksInRange: sumInsightValues(accountInsights, "website_clicks", "profile_links_taps"),
    followerGrowthInRange: sumInsightValues(accountInsights, "follower_count"),
  };
}

function deltaFromHistory(history, currentFollowers, days) {
  if (!history.length) return null;

  const targetTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const olderSnapshots = history.filter((snapshot) => {
    const date = new Date(snapshot.collectedAt);
    return !Number.isNaN(date.getTime()) && date.getTime() <= targetTime;
  });
  if (!olderSnapshots.length) return null;

  const baseline = olderSnapshots[olderSnapshots.length - 1];
  return currentFollowers - numberOrZero(baseline.followers);
}

function buildTopPosts(posts) {
  const by = (field) => [...posts].sort((a, b) => numberOrZero(b[field]) - numberOrZero(a[field])).slice(0, 10);
  return {
    byEngagementRate: by("engagementRate"),
    byLikes: by("likes"),
    byComments: by("comments"),
    byViews: by("views"),
  };
}

function readHistory(historyPath) {
  if (!existsSync(historyPath)) return [];

  const content = readFileSync(historyPath, "utf8").trim();
  if (!content) return [];

  const [header, ...rows] = content.split(/\r?\n/);
  const columns = parseCsvLine(header);
  return rows.map((row) => {
    const values = parseCsvLine(row);
    return columns.reduce((record, column, index) => {
      const raw = values[index] ?? "";
      const numeric = Number(raw);
      record[column] = raw !== "" && Number.isFinite(numeric) ? numeric : raw;
      return record;
    }, {});
  });
}

function appendHistory(historyPath, snapshot) {
  const columns = [
    "collectedAt",
    "username",
    "followers",
    "following",
    "mediaCount",
    "postsAnalyzed",
    "averageEngagementRate",
    "totalLikes",
    "totalComments",
    "totalViews",
  ];
  const line = columns.map((column) => csvCell(snapshot[column])).join(",");

  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, `${columns.join(",")}\n${line}\n`, "utf8");
  } else {
    const existing = readFileSync(historyPath, "utf8");
    writeFileSync(historyPath, `${existing.trimEnd()}\n${line}\n`, "utf8");
  }
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeCsv(path, rows) {
  if (!rows.length) {
    writeFileSync(path, "", "utf8");
    return;
  }

  const columns = Object.keys(rows[0]).filter((column) => column !== "rawInsights");
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (quoted && character === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ",") {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

async function run() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN est requis, ou passez --access-token.");
  }
  if (!args.igUserId) {
    throw new Error("INSTAGRAM_IG_USER_ID est requis, ou passez --ig-user-id.");
  }

  const dateRange = buildDateRange(args);
  const outputDir = resolve(projectRoot, args.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const client = new GraphApiClient(args);
  const warnings = [];

  const profile = await client.get(args.igUserId, { fields: PROFILE_FIELDS });
  if (args.username && cleanUsername(profile.username || "") !== args.username) {
    throw new Error(
      `Le compte connecte est @${profile.username}, pas @${args.username}. Verifiez INSTAGRAM_IG_USER_ID.`,
    );
  }

  const username = cleanUsername(profile.username || args.username || args.igUserId);
  const safeUsername = username.replace(/[^a-zA-Z0-9._-]/g, "_");
  const media = await fetchPaged(
    client,
    `${args.igUserId}/media`,
    { fields: MEDIA_FIELDS, limit: Math.min(args.limit, 100) },
    args.limit,
  );

  const accountInsights = await fetchInsightGroups(
    client,
    args.igUserId,
    USER_INSIGHT_GROUPS,
    { period: "day", since: dateRange.since, until: dateRange.until },
    warnings,
  );

  const posts = [];
  for (const item of media) {
    const mediaInsights = args.includeMediaInsights
      ? await fetchInsightGroups(client, item.id, MEDIA_INSIGHT_GROUPS, {}, warnings)
      : {};
    posts.push(normalizePost(item, mediaInsights, numberOrZero(profile.followers_count)));
  }

  const collectedAt = new Date().toISOString();
  const historyPath = join(outputDir, `${safeUsername}-follower-history.csv`);
  const existingHistory = readHistory(historyPath);
  const snapshot = {
    collectedAt,
    username,
    followers: numberOrZero(profile.followers_count),
    following: numberOrZero(profile.follows_count),
    mediaCount: numberOrZero(profile.media_count),
    postsAnalyzed: posts.length,
    averageEngagementRate: average(posts.map((post) => post.engagementRate)),
    totalLikes: sum(posts.map((post) => post.likes)),
    totalComments: sum(posts.map((post) => post.comments)),
    totalViews: sum(posts.map((post) => post.views)),
  };
  appendHistory(historyPath, snapshot);
  const history = [...existingHistory, snapshot];

  const aggregates = buildAggregates(profile, posts, accountInsights, history);
  const report = {
    meta: {
      collectedAt,
      source: "instagram-graph-api",
      graphVersion: args.graphVersion,
      insightRange: dateRange,
      postLimit: args.limit,
    },
    profile,
    aggregates,
    followerHistory: history,
    accountInsights,
    posts,
    topPosts: buildTopPosts(posts),
    warnings,
  };

  const timestamp = collectedAt.replace(/[:.]/g, "-");
  const jsonPath = join(outputDir, `${safeUsername}-audit-${timestamp}.json`);
  const postsCsvPath = join(outputDir, `${safeUsername}-posts-${timestamp}.csv`);
  writeJson(jsonPath, report);
  writeCsv(postsCsvPath, posts);

  console.log(`Audit Instagram termine pour @${username}`);
  console.log(`Abonnes: ${aggregates.followers}`);
  console.log(`Posts analyses: ${aggregates.postsAnalyzed}`);
  console.log(`Engagement moyen: ${aggregates.averageEngagementRate}%`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV posts: ${postsCsvPath}`);
  console.log(`Historique abonnes: ${historyPath}`);
  if (warnings.length) {
    console.log(`${warnings.length} metric(s) ignoree(s). Voir le champ "warnings" dans le JSON.`);
  }
}

run().catch((error) => {
  console.error(`Erreur: ${error.message}`);
  process.exitCode = 1;
});
