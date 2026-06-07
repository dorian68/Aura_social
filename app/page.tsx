import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import Link from "next/link";
import AuthNav from "./AuthNav";

function getPublicCommunities() {
  try {
    const db = getAuraDatabase();
    return db
      .prepare(
        `SELECT c.id, c.slug, c.name, c.description, c.brand_color,
                cr.display_name AS creator_name,
                (SELECT COUNT(*) FROM sf_memberships m WHERE m.community_id = c.id) AS member_count
         FROM sf_communities c
         JOIN sf_creators cr ON cr.id = c.creator_id
         WHERE c.is_public = 1
         ORDER BY c.created_at DESC
         LIMIT 12`
      )
      .all() as {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        brand_color: string;
        creator_name: string;
        member_count: number;
      }[];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const communities = getPublicCommunities();

  return (
    <div className="min-h-screen bg-[#060A08] text-[#FFF7E8]">
      {/* Nav */}
      <nav className="border-b border-[#1e2820] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-black text-lg tracking-tight">
          <span className="text-[#B8FF4D]">Aura</span> Superfan
        </span>
        <div className="flex items-center gap-3 text-sm">
          <a href="#clubs" className="text-white/50 hover:text-white/80 transition-colors hidden sm:inline">
            Explore Clubs
          </a>
          <AuthNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, #B8FF4D18 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-[#B8FF4D40] text-[#B8FF4D] bg-[#B8FF4D10]">
            Creator Fan Club OS
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
            Turn followers into
            <br />
            <span className="text-[#B8FF4D]">superfans</span>
          </h1>
          <p className="text-white/50 text-lg leading-relaxed max-w-lg mx-auto">
            Launch your fan club in minutes. Reward loyalty across every platform — Instagram,
            TikTok, YouTube, Discord. Own your community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="/onboarding"
              className="px-8 py-3 rounded-xl font-bold text-[#060A08] text-sm bg-[#B8FF4D] hover:brightness-110 active:scale-[0.97] transition-all"
            >
              Launch your Fan Club — Free →
            </a>
            <a
              href="#clubs"
              className="px-8 py-3 rounded-xl font-bold text-sm border border-[#1e2820] text-white/60 hover:border-[#B8FF4D40] hover:text-white/80 transition-all"
            >
              Explore Clubs
            </a>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-4xl mx-auto px-6 pb-20 grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: "⭐",
            title: "Points & Tiers",
            desc: "Fans earn points for every action — posts, visits, shares, referrals. Auto-tier to Fan → Superfan → VIP.",
          },
          {
            icon: "🌐",
            title: "Cross-Platform Signals",
            desc: "Detect fan actions on Instagram, TikTok, YouTube, Twitch, Discord and reward them automatically.",
          },
          {
            icon: "🎁",
            title: "Rewards & Exclusives",
            desc: "Offer digital drops, physical merch, partner deals, and VIP experiences. Fans redeem with points.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-[#1e2820] bg-[#0B0F0E] p-6 space-y-3"
          >
            <span className="text-3xl">{item.icon}</span>
            <h3 className="font-bold text-[#FFF7E8]">{item.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Live clubs */}
      <section id="clubs" className="max-w-4xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-black text-2xl text-[#FFF7E8]">Live Fan Clubs</h2>
          <span className="text-xs text-white/30">{communities.length} club{communities.length !== 1 ? "s" : ""}</span>
        </div>

        {communities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1e2820] bg-[#0B0F0E] p-12 text-center space-y-4">
            <p className="text-4xl">🌱</p>
            <p className="text-white/40 text-sm">No public clubs yet — be the first creator.</p>
            <a
              href="/onboarding"
              className="inline-block px-6 py-2.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 transition-all"
            >
              Launch the first club →
            </a>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((c) => {
              const brand = c.brand_color ?? "#B8FF4D";
              return (
                <Link
                  key={c.id}
                  href={`/club/${c.slug}`}
                  className="group rounded-2xl border border-[#1e2820] bg-[#0B0F0E] p-5 hover:border-[#B8FF4D30] transition-colors space-y-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{ background: brand + "22", color: brand }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#FFF7E8] text-sm group-hover:text-[#B8FF4D] transition-colors">
                      {c.name}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">by {c.creator_name}</p>
                  </div>
                  {c.description && (
                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-white/30">
                      {c.member_count.toLocaleString()} member{c.member_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: brand }}>
                      Join →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e2820] py-8 px-6 text-center">
        <p className="text-xs text-white/20">
          Powered by <span className="text-white/40 font-semibold">Aura</span> · Creator Superfan OS
        </p>
      </footer>
    </div>
  );
}
