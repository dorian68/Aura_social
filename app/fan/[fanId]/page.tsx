"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface Fan { id: string; email: string; displayName?: string; city?: string; }
interface Membership { communityId: string; tier: string; joinedAt: string; lastActiveAt: string; referralCode: string; }
interface Ledger { balance: number; totalEarned: number; totalSpent: number; }
interface Transaction { id: string; type: string; amount: number; source: string; note?: string; createdAt: string; }
interface FanPlatformAccount { platform: string; handle: string; followersCount?: number; connectedStatus: string; }
interface CommunityInfo { id: string; name: string; slug: string; brandColor: string; membership: Membership; ledger: Ledger; rank: number; total: number; }

const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  instagram: { icon: "📸", label: "Instagram" },
  tiktok:    { icon: "🎵", label: "TikTok" },
  youtube:   { icon: "▶️",  label: "YouTube" },
  twitch:    { icon: "🟣", label: "Twitch" },
  discord:   { icon: "💬", label: "Discord" },
};

const TIER_STYLE: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  vip:      { label: "VIP",      color: "#f59e0b", bg: "#f59e0b18", emoji: "👑" },
  superfan: { label: "Superfan", color: "#B8FF4D", bg: "#B8FF4D18", emoji: "⚡" },
  fan:      { label: "Fan",      color: "#6b7280", bg: "#6b728018", emoji: "🌱" },
};

export default function FanProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fanId = params.fanId as string;

  const [fan, setFan] = useState<Fan | null>(null);
  const [communities, setCommunities] = useState<CommunityInfo[]>([]);
  const [platforms, setPlatforms] = useState<FanPlatformAccount[]>([]);
  const [configured, setConfigured] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");

  const justConnected = searchParams.get("connected");
  const defaultCommunity = communities[0];
  const brand = defaultCommunity?.brandColor ?? "#B8FF4D";

  const load = useCallback(async () => {
    try {
      // Fan profile
      const [fanRes, platformRes] = await Promise.all([
        fetch(`/api/fan/${fanId}/points`),
        fetch(`/api/fan/${fanId}/platforms`),
      ]);

      if (!fanRes.ok) throw new Error("Fan not found");
      const fanData = await fanRes.json();
      // /api/fan/[fanId]/points returns ledger for ONE community — we need a different endpoint
      // Let's use the platforms endpoint to get fan info
      if (platformRes.ok) {
        const pd = await platformRes.json();
        if (pd.success) {
          setPlatforms(pd.data.accounts);
          setConfigured(pd.data.configured);
        }
      }

      // Fetch fan info from points (any community)
      if (fanData.success) {
        // We have ledger data but need full fan + communities list
        // Use a simplified approach: display what we can
      }

      // Fetch fan's points and transactions from the first available community
      // We'll discover which communities they're in via the leaderboard or a dedicated endpoint
      // For now we show platform data + any community info from URL context
      setFan({ id: fanId, email: "", displayName: fanData.data?.fanId ? "Fan" : "Fan" });

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fanId]);

  // Better: use a comprehensive fan profile endpoint
  const loadFull = useCallback(async () => {
    try {
      const [platformRes, txRes] = await Promise.all([
        fetch(`/api/fan/${fanId}/platforms`),
        fetch(`/api/fan/${fanId}/transactions?limit=20`),
      ]);

      if (platformRes.ok) {
        const pd = await platformRes.json();
        if (pd.success) { setPlatforms(pd.data.accounts ?? []); setConfigured(pd.data.configured ?? []); }
      }

      if (txRes.ok) {
        const td = await txRes.json();
        if (td.success) setTransactions(td.data.transactions ?? []);
      }

      setFan({ id: fanId, email: "", displayName: "Fan" });
      setLoading(false);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [fanId]);

  useEffect(() => { loadFull(); }, [loadFull]);

  useEffect(() => {
    if (justConnected) {
      setNotification(`✓ ${PLATFORM_META[justConnected]?.label ?? justConnected} connecté !`);
      setTimeout(() => setNotification(""), 4000);
    }
  }, [justConnected]);

  const connectedSet = new Set(platforms.filter(p => p.connectedStatus === "connected").map(p => p.platform));
  const totalFollowers = platforms.filter(p => p.connectedStatus === "connected").reduce((s, p) => s + (p.followersCount ?? 0), 0);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div className="min-h-screen bg-[#060A08]">
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-[#0B0F0E] border text-sm font-medium shadow-lg" style={{ borderColor: brand + "60", color: brand }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#1e2820] px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-[#060A08]" style={{ background: brand }}>
            {fan?.displayName?.[0]?.toUpperCase() ?? "F"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg truncate">{fan?.displayName ?? "Mon profil Fan"}</h1>
            <p className="text-xs text-white/30">ID: {fanId.slice(0, 8)}…</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Connected platforms */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Mes réseaux connectés</h2>
            {totalFollowers > 0 && (
              <span className="text-xs text-white/40">{totalFollowers.toLocaleString()} abonnés total</span>
            )}
          </div>

          {platforms.filter(p => p.connectedStatus === "connected").length > 0 ? (
            <div className="space-y-2 mb-4">
              {platforms.filter(p => p.connectedStatus === "connected").map(p => {
                const meta = PLATFORM_META[p.platform] ?? { icon: "🔗", label: p.platform };
                return (
                  <div key={p.platform} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-white/40">@{p.handle}{p.followersCount ? ` · ${p.followersCount.toLocaleString()} abonnés` : ""}</p>
                    </div>
                    <span className="text-xs text-green-400">✓ Connecté</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-4 rounded-xl bg-[#0B0F0E] border border-[#1e2820] mb-4 text-center">
              <p className="text-sm text-white/40">Aucun réseau connecté pour le moment</p>
            </div>
          )}

          {/* Connect more platforms */}
          {configured.filter(p => !connectedSet.has(p)).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/30 mb-2">Connecte tes réseaux pour que tes actions soient comptées automatiquement :</p>
              {configured.filter(p => !connectedSet.has(p)).map(p => {
                const meta = PLATFORM_META[p] ?? { icon: "🔗", label: p };
                return (
                  <a
                    key={p}
                    href={`/api/fan-auth/${p}/start?fanId=${fanId}&redirectAfter=${encodeURIComponent(`/fan/${fanId}`)}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] hover:border-white/20 transition-colors"
                  >
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-white/30">Connecter ce compte</p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#060A08]" style={{ background: brand }}>
                      Connecter
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {configured.length === 0 && (
            <p className="text-xs text-white/20 text-center py-2">Les connexions OAuth ne sont pas encore configurées sur ce serveur.</p>
          )}
        </section>

        {/* Why connect */}
        {platforms.filter(p => p.connectedStatus === "connected").length === 0 && configured.length > 0 && (
          <section className="rounded-2xl border border-[#1e2820] bg-[#0B0F0E] p-5 space-y-3">
            <h3 className="font-bold text-sm">Pourquoi connecter tes réseaux ?</h3>
            <div className="space-y-2.5">
              {[
                ["⚡", "Tes posts et stories sont détectés automatiquement"],
                ["🎯", "Les défis sont validés sans attendre une approbation manuelle"],
                ["📊", "Le créateur peut mesurer ton engagement global"],
                ["🏆", "Tu montes plus vite dans le classement"],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-start gap-2.5">
                  <span className="text-lg leading-none mt-0.5">{icon}</span>
                  <p className="text-sm text-white/60">{text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent transactions */}
        {transactions.length > 0 && (
          <section>
            <h2 className="font-bold text-base mb-4">Historique de points</h2>
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70">{t.note ?? t.source.replace(/_/g, " ")}</p>
                    <p className="text-xs text-white/30">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${t.type === "earn" ? "" : "text-red-400"}`}
                    style={t.type === "earn" ? { color: brand } : undefined}>
                    {t.type === "earn" ? "+" : "-"}{Math.abs(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Back to clubs */}
        <div className="text-center pt-4">
          <p className="text-xs text-white/20">Powered by <span className="text-white/40 font-semibold">Aura</span> · Creator Superfan OS</p>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#060A08] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#B8FF4D] border-t-transparent animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#060A08] flex items-center justify-center px-4 text-center">
      <div className="space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-sm text-red-400">{message}</p>
      </div>
    </div>
  );
}
