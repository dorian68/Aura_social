"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import LogoutButton from "./LogoutButton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  totalFans: number; activeThisWeek: number; totalPointsAwarded: number;
  pendingCompletions: number; pendingRedemptions: number;
  tiers: Record<string, number>; totalCampaignCommission: number;
}
interface Community {
  id: string; creatorId: string; name: string; slug: string; brandColor: string;
  description?: string; isPublic: boolean;
}
interface Fan { id: string; displayName: string; email: string; tier: string; points: number; balance: number; joinedAt: string; lastActiveAt: string; }
interface Challenge { id: string; title: string; description?: string; status: string; pointsReward: number; type: string; verificationMethod: string; completionCount?: number; expiresAt?: string; }
interface Reward { id: string; title: string; description?: string; status: string; pointsCost: number; type: string; stock?: number; redeemed: number; }
interface Completion { id: string; challengeId: string; fanId: string; communityId: string; status: string; proofUrl?: string; createdAt: string; }
interface Redemption { id: string; rewardId: string; fanId: string; communityId: string; status: string; pointsSpent: number; createdAt: string; }
interface Platform { platform: string; handle: string; followersCount?: number; connectedStatus: string; }
interface Analytics {
  totalCreatorFollowers: number;
  fanStats: { total: number; connectedToAnyPlatform: number; connectionRate: number };
  reach: { totalFanFollowers: number; byPlatform: { platform: string; fan_count: number; total_followers: number }[] };
  engagement: { totalPointsAwarded: number; bySource: { source: string; total: number }[] };
  growth: { newFansByWeek: { week: string; count: number }[] };
}

type Tab = "overview" | "members" | "challenges" | "rewards" | "approvals" | "analytics" | "platforms";

const TIER_STYLE: Record<string, { color: string; bg: string }> = {
  vip:      { color: "#f59e0b", bg: "#f59e0b18" },
  superfan: { color: "#B8FF4D", bg: "#B8FF4D18" },
  fan:      { color: "#6b7280", bg: "#6b728018" },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardShell({ communityId, creatorEmail, creatorName }: {
  communityId: string; creatorEmail: string; creatorName: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [community, setCommunity] = useState<Community | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fans, setFans] = useState<Fan[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [configuredPlatforms, setConfiguredPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(""), 3000);
  }, []);

  const brand = community?.brandColor ?? "#B8FF4D";

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadOverview = useCallback(async () => {
    const r = await fetch(`/api/admin/dashboard/${communityId}`);
    const j = await r.json();
    if (!j.success) throw new Error(j.error?.message ?? "Not found");
    setCommunity(j.data.community);
    setStats(j.data.stats);
    setChallenges(j.data.challenges);
    setRewards(j.data.rewards);
  }, [communityId]);

  const loadFans = useCallback(async () => {
    const r = await fetch(`/api/admin/fans/${communityId}?limit=100`);
    const j = await r.json();
    if (j.success) setFans(j.data.fans ?? j.data ?? []);
  }, [communityId]);

  const loadChallenges = useCallback(async () => {
    const r = await fetch(`/api/admin/challenges/${communityId}`);
    const j = await r.json();
    if (j.success) setChallenges(j.data.challenges ?? []);
  }, [communityId]);

  const loadRewards = useCallback(async () => {
    const r = await fetch(`/api/admin/rewards/${communityId}`);
    const j = await r.json();
    if (j.success) setRewards(j.data.rewards ?? []);
  }, [communityId]);

  const loadApprovals = useCallback(async () => {
    const [d, pc, pr] = await Promise.all([
      fetch(`/api/admin/dashboard/${communityId}`).then(r => r.json()),
      fetch(`/api/admin/completions/${communityId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/admin/redemptions/${communityId}`).then(r => r.json()).catch(() => null),
    ]);
    if (d.success) setStats(d.data.stats);
    if (pc?.success) setCompletions(pc.data.completions ?? []);
    if (pr?.success) setRedemptions(pr.data.redemptions ?? []);
  }, [communityId]);

  const loadPlatforms = useCallback(async () => {
    if (!community) return;
    const p = await fetch(`/api/platforms/${community.creatorId}`).then(x => x.json());
    if (p.success) {
      setPlatforms(p.data.accounts ?? []);
      setConfiguredPlatforms(p.data.configured ?? []);
    }
  }, [community]);

  useEffect(() => {
    setLoading(true);
    loadOverview()
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [loadOverview]);

  useEffect(() => {
    if (tab === "members") loadFans();
    if (tab === "challenges") loadChallenges();
    if (tab === "rewards") loadRewards();
    if (tab === "approvals") loadApprovals();
    if (tab === "analytics") { fetch(`/api/admin/analytics/${communityId}`).then(r => r.json()).then(j => { if (j.success) setAnalytics(j.data); }); }
    if (tab === "platforms") loadPlatforms();
  }, [tab, loadFans, loadChallenges, loadRewards, loadApprovals, loadPlatforms]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function approveCompletion(id: string) {
    const r = await fetch(`/api/admin/completions/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const j = await r.json();
    if (j.success) { setCompletions(cs => cs.filter(c => c.id !== id)); notify("Completion approved — points awarded"); }
    else notify("Error: " + (j.error?.message ?? "failed"));
  }

  async function rejectCompletion(id: string) {
    const r = await fetch(`/api/admin/completions/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const j = await r.json();
    if (j.success) { setCompletions(cs => cs.filter(c => c.id !== id)); notify("Completion rejected"); }
    else notify("Error: " + (j.error?.message ?? "failed"));
  }

  async function fulfillRedemption(id: string) {
    const r = await fetch(`/api/admin/redemptions/${id}/fulfill`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const j = await r.json();
    if (j.success) { setRedemptions(rs => rs.filter(x => x.id !== id)); notify("Redemption fulfilled"); }
    else notify("Error: " + (j.error?.message ?? "failed"));
  }

  async function pauseChallenge(id: string) {
    const r = await fetch(`/api/admin/challenges/${communityId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "ended" }) });
    const j = await r.json();
    if (j.success) { loadChallenges(); notify("Challenge paused"); }
  }

  async function pauseReward(id: string) {
    const r = await fetch(`/api/admin/rewards/${communityId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "paused" }) });
    const j = await r.json();
    if (j.success) { loadRewards(); notify("Reward paused"); }
  }

  if (loading) return <LoadingScreen />;
  if (error || !community) return <ErrorScreen message={error || "Community not found"} />;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview",   label: "Overview" },
    { id: "members",    label: "Members", badge: stats?.totalFans },
    { id: "challenges", label: "Challenges" },
    { id: "rewards",    label: "Rewards" },
    { id: "approvals",  label: "Approvals", badge: (stats?.pendingCompletions ?? 0) + (stats?.pendingRedemptions ?? 0) || undefined },
    { id: "analytics",  label: "Analytics" },
    { id: "platforms",  label: "Platforms" },
  ];

  return (
    <div className="min-h-screen bg-[#060A08]">
      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-[#0B0F0E] border text-sm font-medium shadow-lg transition-all" style={{ borderColor: brand + "60", color: brand }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#1e2820] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: brand }} />
            <h1 className="font-black text-lg truncate">{community.name}</h1>
            <span className="text-xs text-white/30 hidden sm:inline">Dashboard</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/30 hidden sm:inline truncate max-w-[140px]">{creatorName}</span>
            <a
              href={`/club/${community.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-[#1e2820] text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
            >
              View club ↗
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div className="border-b border-[#1e2820] overflow-x-auto">
        <div className="max-w-4xl mx-auto flex px-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? "border-current" : "border-transparent text-white/40 hover:text-white/70"}`}
              style={tab === t.id ? { color: brand } : undefined}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: brand + "25", color: brand }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {tab === "overview"   && stats && <OverviewTab stats={stats} brand={brand} community={community} />}
        {tab === "members"    && <MembersTab fans={fans} brand={brand} />}
        {tab === "challenges" && <ChallengesTab challenges={challenges} communityId={communityId} brand={brand} onRefresh={loadChallenges} onPause={pauseChallenge} notify={notify} />}
        {tab === "rewards"    && <RewardsTab rewards={rewards} communityId={communityId} brand={brand} onRefresh={loadRewards} onPause={pauseReward} notify={notify} />}
        {tab === "approvals"  && <ApprovalsTab completions={completions} redemptions={redemptions} onApprove={approveCompletion} onReject={rejectCompletion} onFulfill={fulfillRedemption} brand={brand} onRefresh={loadApprovals} />}
        {tab === "analytics"  && <AnalyticsTab analytics={analytics} brand={brand} />}
        {tab === "platforms"  && <PlatformsTab accounts={platforms} configured={configuredPlatforms} community={community} brand={brand} />}
      </main>
    </div>
  );
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, brand }: { label: string; value: string | number; sub?: string; brand: string }) {
  return (
    <div className="bg-[#0B0F0E] border border-[#1e2820] rounded-xl p-5">
      <p className="text-xs text-white/40 mb-2">{label}</p>
      <p className="text-2xl font-black" style={{ color: brand }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function OverviewTab({ stats, brand, community }: { stats: Stats; brand: string; community: Community }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total fans" value={stats.totalFans} sub={`${stats.activeThisWeek} active this week`} brand={brand} />
        <StatCard label="Points awarded" value={stats.totalPointsAwarded.toLocaleString()} brand={brand} />
        <StatCard label="Pending actions" value={(stats.pendingCompletions + stats.pendingRedemptions)} sub={`${stats.pendingCompletions} completions · ${stats.pendingRedemptions} redemptions`} brand={brand} />
        <StatCard label="VIP members" value={stats.tiers.vip ?? 0} brand={brand} />
        <StatCard label="Superfans" value={stats.tiers.superfan ?? 0} brand={brand} />
        <StatCard label="Commission earned" value={`€${(stats.totalCampaignCommission).toFixed(0)}`} brand={brand} />
      </div>
      <div className="bg-[#0B0F0E] border border-[#1e2820] rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-sm">Quick links</h3>
        <div className="flex flex-wrap gap-2">
          <a href={`/club/${community.slug}`} target="_blank" className="text-xs px-3 py-2 rounded-lg border border-[#1e2820] text-white/60 hover:text-white/90 hover:border-white/20 transition-colors">Public club page ↗</a>
          <a href={`/club/${community.slug}#join`} target="_blank" className="text-xs px-3 py-2 rounded-lg border border-[#1e2820] text-white/60 hover:text-white/90 hover:border-white/20 transition-colors">Join form ↗</a>
        </div>
      </div>
    </div>
  );
}

function MembersTab({ fans, brand }: { fans: Fan[]; brand: string }) {
  const [search, setSearch] = useState("");
  const filtered = fans.filter(f => !search || f.displayName.toLowerCase().includes(search.toLowerCase()) || f.email.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <input
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm text-[#FFF7E8] placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]"
      />
      {filtered.length === 0 ? (
        <EmptyState icon="👥" text="No members yet. Share the club link to get your first fans!" />
      ) : (
        <div className="space-y-2">
          {filtered.map(f => {
            const ts = TIER_STYLE[f.tier] ?? TIER_STYLE.fan;
            return (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.displayName}</p>
                  <p className="text-xs text-white/30 truncate">{f.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ color: ts.color, background: ts.bg }}>{f.tier}</span>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: brand }}>{f.balance.toLocaleString()} pts</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChallengesTab({ challenges, communityId, brand, onRefresh, onPause, notify }: {
  challenges: Challenge[]; communityId: string; brand: string;
  onRefresh: () => void; onPause: (id: string) => void; notify: (m: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", pointsReward: "100", type: "custom", verificationMethod: "manual" });

  async function create() {
    if (!form.title || !form.pointsReward) return;
    setSaving(true);
    const r = await fetch(`/api/admin/challenges/${communityId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pointsReward: Number(form.pointsReward) }),
    });
    const j = await r.json();
    setSaving(false);
    if (j.success) { onRefresh(); setShowForm(false); setForm({ title: "", description: "", pointsReward: "100", type: "custom", verificationMethod: "manual" }); notify("Challenge created!"); }
    else notify("Error: " + (j.error?.message ?? "failed"));
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-[#060A08] border border-[#1e2820] text-sm text-[#FFF7E8] placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(s => !s)} className="text-sm px-4 py-2 rounded-xl font-semibold text-[#060A08]" style={{ background: brand }}>
          {showForm ? "Cancel" : "+ New Challenge"}
        </button>
      </div>
      {showForm && (
        <div className="bg-[#0B0F0E] border border-[#1e2820] rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">New Challenge</h3>
          <input className={inputCls} placeholder="Title*" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className={inputCls} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} type="number" min="1" placeholder="Points reward*" value={form.pointsReward} onChange={e => setForm(f => ({ ...f, pointsReward: e.target.value }))} />
            <select className={inputCls} value={form.verificationMethod} onChange={e => setForm(f => ({ ...f, verificationMethod: e.target.value }))}>
              <option value="manual">Manual review</option>
              <option value="honor">Honor system</option>
              <option value="qr">QR scan</option>
              <option value="coupon">Coupon code</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="custom">Custom</option>
            <option value="post">Post</option>
            <option value="visit">Visit</option>
            <option value="share">Share</option>
            <option value="referral">Referral</option>
            <option value="purchase">Purchase</option>
          </select>
          <button onClick={create} disabled={saving} className="w-full py-2.5 rounded-xl font-bold text-sm text-[#060A08] disabled:opacity-50" style={{ background: brand }}>
            {saving ? "Saving…" : "Create Challenge"}
          </button>
        </div>
      )}
      {challenges.length === 0 ? (
        <EmptyState icon="⭐" text="No challenges yet. Create your first to start engaging fans!" />
      ) : (
        <div className="space-y-2">
          {challenges.map(c => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-4 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-[#FFF7E8]">{c.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "active" ? "text-green-400 bg-green-400/10" : "text-white/30 bg-white/5"}`}>{c.status}</span>
                </div>
                {c.description && <p className="text-xs text-white/40 mt-0.5 truncate">{c.description}</p>}
                <p className="text-xs text-white/30 mt-1">{c.completionCount ?? 0} completions · {c.verificationMethod}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-sm font-black" style={{ color: brand }}>+{c.pointsReward}</p>
                {c.status === "active" && (
                  <button onClick={() => onPause(c.id)} className="text-xs text-white/30 hover:text-red-400 transition-colors">Pause</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RewardsTab({ rewards, communityId, brand, onRefresh, onPause, notify }: {
  rewards: Reward[]; communityId: string; brand: string;
  onRefresh: () => void; onPause: (id: string) => void; notify: (m: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", pointsCost: "200", type: "physical", stock: "" });

  async function create() {
    if (!form.title || !form.pointsCost) return;
    setSaving(true);
    const r = await fetch(`/api/admin/rewards/${communityId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pointsCost: Number(form.pointsCost), stock: form.stock ? Number(form.stock) : undefined }),
    });
    const j = await r.json();
    setSaving(false);
    if (j.success) { onRefresh(); setShowForm(false); setForm({ title: "", description: "", pointsCost: "200", type: "physical", stock: "" }); notify("Reward created!"); }
    else notify("Error: " + (j.error?.message ?? "failed"));
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-[#060A08] border border-[#1e2820] text-sm text-[#FFF7E8] placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(s => !s)} className="text-sm px-4 py-2 rounded-xl font-semibold text-[#060A08]" style={{ background: brand }}>
          {showForm ? "Cancel" : "+ New Reward"}
        </button>
      </div>
      {showForm && (
        <div className="bg-[#0B0F0E] border border-[#1e2820] rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">New Reward</h3>
          <input className={inputCls} placeholder="Title*" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className={inputCls} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} type="number" min="1" placeholder="Points cost*" value={form.pointsCost} onChange={e => setForm(f => ({ ...f, pointsCost: e.target.value }))} />
            <input className={inputCls} type="number" min="1" placeholder="Stock limit (optional)" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
          <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
            <option value="experience">Experience</option>
            <option value="partner_offer">Partner offer</option>
          </select>
          <button onClick={create} disabled={saving} className="w-full py-2.5 rounded-xl font-bold text-sm text-[#060A08] disabled:opacity-50" style={{ background: brand }}>
            {saving ? "Saving…" : "Create Reward"}
          </button>
        </div>
      )}
      {rewards.length === 0 ? (
        <EmptyState icon="🎁" text="No rewards yet. Add something that excites your fans!" />
      ) : (
        <div className="space-y-2">
          {rewards.map(r => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-4 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-[#FFF7E8]">{r.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "active" ? "text-green-400 bg-green-400/10" : "text-white/30 bg-white/5"}`}>{r.status}</span>
                </div>
                {r.description && <p className="text-xs text-white/40 mt-0.5 truncate">{r.description}</p>}
                <p className="text-xs text-white/30 mt-1">{r.redeemed} redeemed{r.stock != null ? ` / ${r.stock} stock` : ""} · {r.type}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-sm font-black text-[#FFF7E8]">{r.pointsCost} pts</p>
                {r.status === "active" && (
                  <button onClick={() => onPause(r.id)} className="text-xs text-white/30 hover:text-red-400 transition-colors">Pause</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalsTab({ completions, redemptions, onApprove, onReject, onFulfill, brand, onRefresh }: {
  completions: Completion[]; redemptions: Redemption[];
  onApprove: (id: string) => void; onReject: (id: string) => void; onFulfill: (id: string) => void;
  brand: string; onRefresh: () => void;
}) {
  const total = completions.length + redemptions.length;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-white/60">{total} pending action{total !== 1 ? "s" : ""}</h2>
        <button onClick={onRefresh} className="text-xs text-white/30 hover:text-white/60">Refresh</button>
      </div>
      {total === 0 && <EmptyState icon="✅" text="You're all caught up! Nothing pending." />}
      {completions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Challenge completions</h3>
          {completions.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 truncate">Challenge completion request</p>
                <p className="text-xs text-white/30 mt-0.5">{new Date(c.createdAt).toLocaleString()}</p>
                {c.proofUrl && <a href={c.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-0.5 block" style={{ color: brand }}>View proof ↗</a>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onApprove(c.id)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-[#060A08]" style={{ background: brand }}>Approve</button>
                <button onClick={() => onReject(c.id)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white/60 bg-white/5 hover:bg-white/10">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {redemptions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Reward redemptions</h3>
          {redemptions.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70">Reward redemption · {r.pointsSpent} pts</p>
                <p className="text-xs text-white/30 mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => onFulfill(r.id)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-[#060A08] shrink-0" style={{ background: brand }}>Mark fulfilled</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ analytics, brand }: { analytics: Analytics | null; brand: string }) {
  if (!analytics) return (
    <div className="py-16 text-center"><div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin mx-auto" style={{ color: brand }} /></div>
  );
  const SOURCE_LABELS: Record<string, string> = {
    join_welcome: "Sign-up bonus", referral: "Referral", challenge_completion: "Challenge",
    qr_scan: "QR scan", coupon: "Coupon", instagram_signal: "Instagram signal",
    tiktok_signal: "TikTok signal", youtube_signal: "YouTube signal", manual: "Manual", other: "Other",
  };
  const PLATFORM_ICONS: Record<string, string> = { instagram: "📸", tiktok: "🎵", youtube: "▶️", twitch: "🟣", discord: "💬" };
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Creator reach" value={analytics.totalCreatorFollowers.toLocaleString()} sub="cumulated followers" brand={brand} />
        <StatCard label="Fan reach" value={analytics.reach.totalFanFollowers.toLocaleString()} sub="followers from connected fans" brand={brand} />
        <StatCard label="Connected fans" value={`${analytics.fanStats.connectedToAnyPlatform} / ${analytics.fanStats.total}`} sub={`${analytics.fanStats.connectionRate}% connection rate`} brand={brand} />
        <StatCard label="Points distributed" value={analytics.engagement.totalPointsAwarded.toLocaleString()} brand={brand} />
      </div>
      {analytics.reach.byPlatform.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Fan platforms</h3>
          {analytics.reach.byPlatform.map(p => (
            <div key={p.platform} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <span className="text-xl">{PLATFORM_ICONS[p.platform] ?? "🔗"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">{p.platform}</p>
                <p className="text-xs text-white/40">{p.fan_count} connected fans</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: brand }}>{p.total_followers.toLocaleString()}</p>
                <p className="text-xs text-white/30">followers</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center space-y-2">
          <p className="text-3xl">📊</p>
          <p className="text-sm text-white/40">No fans have connected their platforms yet.</p>
        </div>
      )}
      {analytics.engagement.bySource.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Points by source</h3>
          {analytics.engagement.bySource.map(s => (
            <div key={s.source} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <span className="text-sm text-white/70">{SOURCE_LABELS[s.source] ?? s.source}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: brand }}>{s.total.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      )}
      {analytics.growth.newFansByWeek.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">New fans by week</h3>
          {analytics.growth.newFansByWeek.map(w => (
            <div key={w.week} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <span className="text-xs text-white/40 w-24 shrink-0">{w.week}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (w.count / Math.max(...analytics.growth.newFansByWeek.map(x => x.count))) * 100)}%`, background: brand }} />
              </div>
              <span className="text-sm font-bold tabular-nums text-right w-8" style={{ color: brand }}>{w.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  instagram: { icon: "📸", label: "Instagram" },
  tiktok:    { icon: "🎵", label: "TikTok" },
  youtube:   { icon: "▶️",  label: "YouTube" },
  twitch:    { icon: "🟣", label: "Twitch" },
  discord:   { icon: "💬", label: "Discord" },
};

function PlatformsTab({ accounts, configured, community, brand }: { accounts: Platform[]; configured: string[]; community: Community; brand: string }) {
  const connectedSet = new Set(accounts.map(a => a.platform));
  return (
    <div className="space-y-6">
      {accounts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Connected</h3>
          {accounts.map(a => {
            const meta = PLATFORM_META[a.platform] ?? { icon: "🔗", label: a.platform };
            return (
              <div key={a.platform} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
                <span className="text-xl">{meta.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-white/40">@{a.handle}{a.followersCount ? ` · ${a.followersCount.toLocaleString()} followers` : ""}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.connectedStatus === "connected" ? "text-green-400 bg-green-400/10" : "text-white/30 bg-white/5"}`}>
                  {a.connectedStatus}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Connect a platform</h3>
        {configured.length === 0 && (
          <p className="text-sm text-white/30 py-4 text-center">No OAuth providers configured on this server.</p>
        )}
        {configured.filter(p => !connectedSet.has(p)).map(p => {
          const meta = PLATFORM_META[p] ?? { icon: "🔗", label: p };
          return (
            <div key={p} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
              <span className="text-xl">{meta.icon}</span>
              <div className="flex-1"><p className="text-sm font-medium">{meta.label}</p></div>
              <a href={`/api/auth/platforms/${p}/start?creatorId=${community.creatorId}&redirectAfter=${encodeURIComponent(`/dashboard/${community.id}`)}`}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-[#060A08] shrink-0" style={{ background: brand }}>
                Connect
              </a>
            </div>
          );
        })}
        {configured.filter(p => connectedSet.has(p)).map(p => {
          const meta = PLATFORM_META[p] ?? { icon: "🔗", label: p };
          return (
            <div key={p} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] opacity-40">
              <span className="text-xl">{meta.icon}</span>
              <div className="flex-1"><p className="text-sm font-medium">{meta.label}</p></div>
              <span className="text-xs text-green-400">✓ Connected</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-12 text-center space-y-2">
      <div className="text-4xl">{icon}</div>
      <p className="text-sm text-white/40 max-w-xs mx-auto">{text}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#060A08] flex items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#B8FF4D] border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-white/30">Loading dashboard…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#060A08] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-sm text-red-400">{message}</p>
        <a href="/" className="text-xs text-white/40 underline">Go home</a>
      </div>
    </div>
  );
}
