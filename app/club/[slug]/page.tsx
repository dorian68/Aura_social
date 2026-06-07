import { notFound } from "next/navigation";
import {
  getCommunityBySlug, getCreator,
  getChallengesForCommunity, getRewardsForCommunity,
  getLeaderboard, getCommunityStats,
} from "@/lib/superfan/db";
import JoinForm from "./JoinForm";

const TIER_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  vip:      { label: "VIP",      color: "#f59e0b", bg: "#f59e0b18" },
  superfan: { label: "Superfan", color: "#B8FF4D", bg: "#B8FF4D18" },
  fan:      { label: "Fan",      color: "#6b7280", bg: "#6b728018" },
};

const CHALLENGE_ICONS: Record<string, string> = {
  post: "📸", visit: "📍", share: "🔗", signup: "✍️", purchase: "🛍️", referral: "👥", custom: "⭐",
};

const REWARD_ICONS: Record<string, string> = {
  digital: "💻", physical: "📦", experience: "🎭", partner_offer: "🤝",
};

export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;

  const community = getCommunityBySlug(slug);
  if (!community || !community.isPublic) notFound();

  const creator = getCreator(community.creatorId);
  const leaderboard = getLeaderboard(community.id, "alltime", 10);
  const challenges = getChallengesForCommunity(community.id, "active");
  const rewards = getRewardsForCommunity(community.id, "active");
  const stats = getCommunityStats(community.id);

  const brand = community.brandColor ?? "#B8FF4D";

  return (
    <div className="min-h-screen bg-[#060A08]">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-12 px-4">
        {community.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: `url(${community.coverImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${brand}22 0%, transparent 70%)` }} />
        )}
        <div className="relative max-w-xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border" style={{ color: brand, borderColor: brand + "40", background: brand + "12" }}>
            Fan Club
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#FFF7E8] leading-[1.1]">
            {community.name}
          </h1>
          {creator && (
            <p className="text-sm text-white/50">
              by <span className="text-white/70 font-medium">{creator.displayName}</span>
              {creator.city && <span className="text-white/40"> · {creator.city}</span>}
            </p>
          )}
          {community.description && (
            <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">{community.description}</p>
          )}
          <div className="flex items-center justify-center gap-6 text-sm pt-2">
            <div className="text-center">
              <p className="font-bold text-lg text-[#FFF7E8]">{stats.totalFans.toLocaleString()}</p>
              <p className="text-white/40 text-xs">Members</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="font-bold text-lg text-[#FFF7E8]">{challenges.length}</p>
              <p className="text-white/40 text-xs">Challenges</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="font-bold text-lg text-[#FFF7E8]">{rewards.length}</p>
              <p className="text-white/40 text-xs">Rewards</p>
            </div>
          </div>
          <a href="#join" className="inline-block mt-2 px-8 py-3 rounded-xl font-bold text-[#060A08] text-sm hover:brightness-110 active:scale-[0.97] transition-all" style={{ background: brand }}>
            Join the Club — Free
          </a>
        </div>
      </section>

      <div className="max-w-xl mx-auto px-4 space-y-12 pb-20">

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#FFF7E8]">Top Fans</h2>
              <span className="text-xs text-white/30">All time</span>
            </div>
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const tierStyle = TIER_STYLES[entry.tier] ?? TIER_STYLES.fan;
                return (
                  <div key={entry.fanId} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
                    <span className="w-7 text-center text-sm font-mono text-white/30">
                      {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
                    </span>
                    <span className="flex-1 font-medium text-sm text-[#FFF7E8] truncate">{entry.displayName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: tierStyle.color, background: tierStyle.bg }}>
                      {tierStyle.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: brand }}>{entry.points.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Challenges */}
        {challenges.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#FFF7E8]">Earn Points</h2>
              <span className="text-xs text-white/30">{challenges.length} active</span>
            </div>
            <div className="grid gap-3">
              {challenges.map(c => (
                <div key={c.id} className="flex items-start gap-4 px-4 py-4 rounded-xl bg-[#0B0F0E] border border-[#1e2820]">
                  <span className="text-2xl leading-none mt-0.5">{CHALLENGE_ICONS[c.type] ?? "⭐"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#FFF7E8]">{c.title}</p>
                    {c.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{c.description}</p>}
                    {c.expiresAt && (
                      <p className="text-xs text-white/30 mt-1">Expires {new Date(c.expiresAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-black" style={{ color: brand }}>+{c.pointsReward}</span>
                    <p className="text-xs text-white/30">pts</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rewards */}
        {rewards.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#FFF7E8]">Redeem Rewards</h2>
              <span className="text-xs text-white/30">{rewards.length} available</span>
            </div>
            <div className="grid gap-3">
              {rewards.map(r => {
                const available = r.stock == null ? true : (r.stock - r.redeemed) > 0;
                return (
                  <div key={r.id} className={`flex items-start gap-4 px-4 py-4 rounded-xl border transition-opacity ${available ? "bg-[#0B0F0E] border-[#1e2820]" : "bg-[#0B0F0E]/50 border-[#1e2820]/50 opacity-60"}`}>
                    <span className="text-2xl leading-none mt-0.5">{REWARD_ICONS[r.type] ?? "🎁"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#FFF7E8]">{r.title}</p>
                      {r.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{r.description}</p>}
                      {r.stock != null && (
                        <p className="text-xs text-white/30 mt-1">{r.stock - r.redeemed} left</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-black text-[#FFF7E8]">{r.pointsCost}</span>
                      <p className="text-xs text-white/30">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Join */}
        <section id="join">
          <div className="rounded-2xl border border-[#1e2820] bg-[#0B0F0E] p-6">
            <div className="text-center mb-6">
              <h2 className="font-black text-xl text-[#FFF7E8]">Join {community.name}</h2>
              <p className="text-sm text-white/40 mt-1">
                Get <span className="font-bold" style={{ color: brand }}>50 pts</span> just for signing up. Earn more with every challenge.
              </p>
            </div>
            <JoinForm slug={slug} initialReferralCode={ref} brandColor={brand} />
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e2820] py-6 px-4 text-center">
        <p className="text-xs text-white/20">
          Powered by <span className="text-white/40 font-semibold">Aura</span> · Creator Superfan OS
        </p>
      </footer>
    </div>
  );
}
