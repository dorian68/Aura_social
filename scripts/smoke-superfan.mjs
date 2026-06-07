/**
 * Smoke test: Superfan OS journey
 *
 * Tests the complete P0 product flow:
 *   creator creation → community → fan join → points → challenges → rewards → leaderboard → signal rules → admin dashboard
 *
 * Usage:
 *   node scripts/smoke-superfan.mjs
 *   SMOKE_BASE_URL=http://localhost:3009 node scripts/smoke-superfan.mjs
 */

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3009";
const results = [];
const state = {};

// ── 1. Health ─────────────────────────────────────────────────────────────────

await run("GET /api/system/health (superfan stats)", async () => {
  const r = await getJson("/api/system/health");
  assert(r.success, "health success");
  const sf = r.data.superfan;
  assert(typeof sf.creators === "number", "superfan.creators present");
  assert(typeof sf.communities === "number", "superfan.communities present");
  return {
    creators: sf.creators,
    communities: sf.communities,
    fans: sf.fans,
    pointsAwarded: sf.pointsAwarded,
    activeChallenges: sf.activeChallenges,
    activeRewards: sf.activeRewards,
    signalRules: sf.signalRules,
  };
});

// ── 2. Create creator ─────────────────────────────────────────────────────────

await run("POST /api/creators (create test creator)", async () => {
  const r = await postJson("/api/creators", {
    displayName: `Smoke Creator ${Date.now()}`,
    bio: "Automated smoke test creator.",
    niche: "music",
  });
  assert(r.success, "creator created");
  assert(r.data.creator.id, "creator has id");
  state.creatorId = r.data.creator.id;
  return { creatorId: state.creatorId.slice(0, 8) };
});

// ── 3. Create community ───────────────────────────────────────────────────────

await run("POST /api/admin/communities (create community)", async () => {
  const slug = `smoke-test-${Date.now().toString(36)}`;
  const r = await postJson("/api/admin/communities", {
    creatorId: state.creatorId,
    name: "Smoke Test Club",
    description: "Automated smoke test community.",
    brandColor: "#B8FF4D",
    isPublic: true,
    customSlug: slug,
  });
  assert(r.success, "community created");
  assert(r.data.community.slug === slug, "slug matches");
  state.communityId = r.data.community.id;
  state.slug = r.data.community.slug;
  return { communityId: state.communityId.slice(0, 8), slug: state.slug };
});

// ── 4. Club public page ───────────────────────────────────────────────────────

await run("GET /api/club/[slug] (public club page)", async () => {
  const r = await getJson(`/api/club/${state.slug}`);
  assert(r.success, "club page success");
  assert(r.data.community.id === state.communityId, "community id matches");
  return { name: r.data.community.name, brandColor: r.data.community.brandColor };
});

// ── 5. Fan join ───────────────────────────────────────────────────────────────

await run("POST /api/club/[slug]/join (fan joins)", async () => {
  const r = await postJson(`/api/club/${state.slug}/join`, {
    email: `smoke-fan-${Date.now()}@test.aura`,
    displayName: "Smoke Fan",
  });
  assert(r.success, "fan joined");
  assert(r.data.fan.id, "fan has id");
  assert(r.data.membership, "membership created");
  assert(r.data.points?.justEarned > 0, "welcome points awarded");
  state.fanId = r.data.fan.id;
  state.welcomePoints = r.data.points.justEarned;
  return {
    fanId: state.fanId.slice(0, 8),
    welcomePoints: state.welcomePoints,
    membershipId: r.data.membership.id?.slice(0, 8),
  };
});

// ── 6. Fan points ─────────────────────────────────────────────────────────────

await run("GET /api/fan/[fanId]/points (fan balance)", async () => {
  const r = await getJson(`/api/fan/${state.fanId}/points?communityId=${state.communityId}`);
  assert(r.success, "points success");
  assert(r.data.ledger.balance === state.welcomePoints, `expected ${state.welcomePoints} pts, got ${r.data.ledger.balance}`);
  assert(r.data.rank.rank >= 1, "fan has a rank");
  return { balance: r.data.ledger.balance, rank: r.data.rank.rank, total: r.data.rank.total };
});

// ── 7. Fan transactions ───────────────────────────────────────────────────────

await run("GET /api/fan/[fanId]/transactions (tx history)", async () => {
  const r = await getJson(`/api/fan/${state.fanId}/transactions?communityId=${state.communityId}`);
  assert(r.success, "transactions success");
  assert(r.data.transactions.length >= 1, "at least one transaction (welcome)");
  const welcome = r.data.transactions.find((t) => t.source === "join_welcome");
  assert(welcome, "join_welcome transaction present");
  return { count: r.data.transactions.length, welcomeSource: welcome?.source };
});

// ── 8. Leaderboard ────────────────────────────────────────────────────────────

await run("GET /api/club/[slug]/leaderboard (leaderboard)", async () => {
  const r = await getJson(`/api/club/${state.slug}/leaderboard`);
  assert(r.success, "leaderboard success");
  assert(r.data.leaderboard.length >= 1, "fan appears on leaderboard");
  const entry = r.data.leaderboard.find((e) => e.fanId === state.fanId);
  assert(entry, "smoke fan on leaderboard");
  return { entries: r.data.leaderboard.length, fanPoints: entry?.points, fanTier: entry?.tier };
});

// ── 9. Challenges list ────────────────────────────────────────────────────────

await run("GET /api/club/[slug]/challenges (challenges list)", async () => {
  const r = await getJson(`/api/club/${state.slug}/challenges`);
  assert(r.success, "challenges success");
  return { count: r.data.challenges.length };
});

// ── 10. Rewards list ──────────────────────────────────────────────────────────

await run("GET /api/club/[slug]/rewards (rewards list)", async () => {
  const r = await getJson(`/api/club/${state.slug}/rewards`);
  assert(r.success, "rewards success");
  return { count: r.data.rewards.length };
});

// ── 11. Admin dashboard ───────────────────────────────────────────────────────

await run("GET /api/admin/dashboard/[communityId] (creator dashboard)", async () => {
  const r = await getJson(`/api/admin/dashboard/${state.communityId}`);
  assert(r.success, "admin dashboard success");
  const stats = r.data.stats;
  assert(stats.totalFans >= 1, "fan count >= 1");
  assert(stats.totalPointsAwarded >= state.welcomePoints, "points awarded tracked");
  return {
    totalFans: stats.totalFans,
    totalPointsAwarded: stats.totalPointsAwarded,
    pendingCompletions: stats.pendingCompletions,
  };
});

// ── 12. Admin fans list ───────────────────────────────────────────────────────

await run("GET /api/admin/fans/[communityId] (fan list)", async () => {
  const r = await getJson(`/api/admin/fans/${state.communityId}`);
  assert(r.success, "fans list success");
  assert(r.data.fans.length >= 1, "at least one fan");
  const found = r.data.fans.find((f) => f.id === state.fanId);
  assert(found, "smoke fan in admin list");
  return { total: r.data.fans.length, fanEmail: found?.email };
});

// ── 13. Award points (admin) ──────────────────────────────────────────────────

await run("POST /api/admin/points/award (award extra points)", async () => {
  const r = await postJson("/api/admin/points/award", {
    fanId: state.fanId,
    communityId: state.communityId,
    amount: 100,
    note: "smoke test bonus",
  });
  assert(r.success, "award success");
  assert(r.data.ledger.balance >= state.welcomePoints + 100, "balance increased after award");
  return { newBalance: r.data.ledger.balance };
});

// ── 14. Verify points increased ───────────────────────────────────────────────

await run("GET /api/fan/[fanId]/points (verify balance after award)", async () => {
  const r = await getJson(`/api/fan/${state.fanId}/points?communityId=${state.communityId}`);
  assert(r.success, "points success");
  const expected = state.welcomePoints + 100;
  assert(r.data.ledger.balance === expected, `expected ${expected} pts, got ${r.data.ledger.balance}`);
  return { balance: r.data.ledger.balance };
});

// ── 15. Signal rules (admin) ──────────────────────────────────────────────────

await run("POST /api/admin/signals/rules/[communityId] (create signal rule)", async () => {
  const r = await postJson(`/api/admin/signals/rules/${state.communityId}`, {
    platform: "instagram",
    signalType: "post",
    keywords: ["aura", "superfan"],
    pointsReward: 50,
    maxPerFan: 5,
    maxPerDay: 2,
  });
  assert(r.success, "rule created");
  assert(r.data.rule.id, "rule has id");
  state.signalRuleId = r.data.rule.id;
  return { ruleId: state.signalRuleId.slice(0, 8), platform: r.data.rule.platform };
});

await run("GET /api/admin/signals/rules/[communityId] (list signal rules)", async () => {
  const r = await getJson(`/api/admin/signals/rules/${state.communityId}`);
  assert(r.success, "rules list success");
  assert(r.data.rules.length >= 1, "at least one rule");
  const found = r.data.rules.find((rule) => rule.id === state.signalRuleId);
  assert(found, "created rule in list");
  return { count: r.data.rules.length };
});

// ── 16. Signal scan (no token — should return graceful error or empty result) ──

await run("POST /api/admin/signals/scan/[communityId] (scan — no oauth)", async () => {
  const r = await postJson(`/api/admin/signals/scan/${state.communityId}`, {
    fanId: state.fanId,
    platform: "instagram",
  });
  assert(r.success, "scan endpoint returns success");
  assert(r.data.mode === "single_fan", "single_fan mode");
  const result = r.data.result;
  assert(result.signalsDetected === 0, "no signals detected (no token)");
  return {
    mode: r.data.mode,
    signalsDetected: result.signalsDetected,
    error: result.error ?? null,
  };
});

// ── 17. Detected signals list ─────────────────────────────────────────────────

await run("GET /api/admin/signals/[communityId] (signals list)", async () => {
  const r = await getJson(`/api/admin/signals/${state.communityId}`);
  assert(r.success, "signals list success");
  assert(typeof r.data.stats.total === "number", "stats.total is number");
  return { total: r.data.stats.total, rules: r.data.stats.rules };
});

// ── 18. Analytics ─────────────────────────────────────────────────────────────

await run("GET /api/admin/analytics/[communityId] (analytics)", async () => {
  const r = await getJson(`/api/admin/analytics/${state.communityId}`);
  assert(r.success, "analytics success");
  assert(r.data.fanStats.total >= 1, "fanStats.total >= 1");
  return {
    totalFans: r.data.fanStats.total,
    connectionRate: r.data.fanStats.connectionRate,
    totalPointsAwarded: r.data.engagement.totalPointsAwarded,
  };
});

// ── 19. Report ────────────────────────────────────────────────────────────────

await run("GET /api/admin/report/[communityId] (creator report)", async () => {
  const r = await getJson(`/api/admin/report/${state.communityId}`);
  assert(r.success, "report success");
  return {
    totalFans: r.data.overview?.totalFans ?? r.data.stats?.totalFans ?? "present",
  };
});

// ── 20. Fan profile endpoint ──────────────────────────────────────────────────

await run("GET /api/fan/[fanId]/profile (fan profile)", async () => {
  const r = await getJson(`/api/fan/${state.fanId}/profile`);
  assert(r.success, "profile success");
  const fan = r.data.fan;
  assert(fan.id === state.fanId, "fan id matches");
  const comm = r.data.communities.find((c) => c.community?.id === state.communityId);
  assert(comm, "community found in profile");
  assert(comm.ledger.balance === state.welcomePoints + 100, `balance ${comm.ledger.balance} = welcome ${state.welcomePoints} + 100 bonus`);
  assert(comm.ledger.totalEarned >= state.welcomePoints + 100, "totalEarned tracked");
  return { balance: comm.ledger.balance, totalEarned: comm.ledger.totalEarned, rank: comm.ledger.rank };
});

// ── 21. Create reward ─────────────────────────────────────────────────────────

await run("POST /api/admin/rewards/[communityId] (create reward)", async () => {
  const r = await postJson(`/api/admin/rewards/${state.communityId}`, {
    title: "Smoke Reward",
    description: "Test reward from smoke suite.",
    pointsCost: 100,
    type: "digital",
  });
  assert(r.success, "reward created");
  assert(r.data.reward.id, "reward has id");
  state.rewardId = r.data.reward.id;
  return { rewardId: state.rewardId.slice(0, 8), pointsCost: r.data.reward.pointsCost };
});

// ── 22. Fan redeems reward ────────────────────────────────────────────────────

await run("POST /api/club/[slug]/redeem (fan redeems reward)", async () => {
  // Resolve the fan's email (join used a dynamic timestamp-based email)
  const fans = await getJson(`/api/admin/fans/${state.communityId}`);
  const fan = fans.data.fans.find((f) => f.id === state.fanId);
  assert(fan, "fan found in admin list");
  state.fanEmail = fan.email;

  const r = await postJson(`/api/club/${state.slug}/redeem`, {
    email: state.fanEmail,
    rewardId: state.rewardId,
  });
  assert(r.success, "redemption success");
  assert(r.data.redemption.status === "pending", "redemption is pending");
  state.redemptionId = r.data.redemption.id;
  return { redemptionId: state.redemptionId.slice(0, 8), status: r.data.redemption.status };
});

// ── 23. Admin sees pending redemption ─────────────────────────────────────────

await run("GET /api/admin/redemptions/[communityId] (pending redemptions)", async () => {
  const r = await getJson(`/api/admin/redemptions/${state.communityId}`);
  assert(r.success, "redemptions list success");
  const found = r.data.redemptions.find((x) => x.id === state.redemptionId);
  assert(found, "redemption appears in admin list");
  assert(found.status === "pending", "status is pending");
  return { count: r.data.redemptions.length };
});

// ── 24. Admin fulfills redemption ─────────────────────────────────────────────

await run("POST /api/admin/redemptions/[id]/fulfill (fulfill redemption)", async () => {
  const r = await postJson(`/api/admin/redemptions/${state.redemptionId}/fulfill`, { note: "smoke test fulfilled" });
  assert(r.success, "fulfill success");
  assert(r.data.fulfilled === true, "fulfilled: true");

  // Verify balance deducted
  const profile = await getJson(`/api/fan/${state.fanId}/profile`);
  const comm = profile.data.communities.find((c) => c.community?.id === state.communityId);
  const expectedBalance = state.welcomePoints + 100 - 100;
  assert(comm.ledger.balance === expectedBalance, `balance ${comm.ledger.balance} = ${expectedBalance} after spend`);
  return { fulfilled: true, newBalance: comm.ledger.balance };
});

// ── Summary ───────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.status === "success").length;
const failed = results.filter((r) => r.status === "fail").length;
const success = failed === 0;

console.log(
  JSON.stringify({ script: "smoke-superfan", baseUrl, success, passed, failed, results }, null, 2)
);
if (!success) process.exitCode = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function run(label, fn) {
  try {
    const output = await fn();
    results.push({ label, status: "success", output });
  } catch (error) {
    results.push({ label, status: "fail", error: error instanceof Error ? error.message : String(error) });
  }
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error?.code ?? ""} ${payload.error?.message ?? response.statusText}`.trim());
  }
  return payload;
}

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error?.code ?? ""} ${payload.error?.message ?? response.statusText}`.trim());
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}
