"use client";
import { useState } from "react";

const NICHES = [
  { value: "music",   label: "🎵 Music" },
  { value: "fashion", label: "👗 Fashion" },
  { value: "gaming",  label: "🎮 Gaming" },
  { value: "fitness", label: "💪 Fitness" },
  { value: "food",    label: "🍕 Food" },
  { value: "art",     label: "🎨 Art" },
  { value: "comedy",  label: "😂 Comedy" },
  { value: "other",   label: "✨ Other" },
];

const BRAND_COLORS = [
  "#B8FF4D", "#C8B4FA", "#FF6B6B", "#FFD93D",
  "#4ECDC4", "#FF8C42", "#6C63FF", "#F7B731",
];

type Step = "creator" | "community" | "challenge" | "success";

interface Result {
  creatorId: string;
  communityId: string;
  slug: string;
  clubName: string;
  brandColor: string;
  dashboardUrl: string;
  clubUrl: string;
}

export default function OnboardingForm() {
  const [step, setStep] = useState<Step>("creator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Step 1 — creator
  const [displayName, setDisplayName] = useState("");
  const [niche, setNiche] = useState("music");
  const [city, setCity] = useState("");

  // Step 2 — community
  const [clubName, setClubName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#B8FF4D");

  // Step 3 — challenge
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengePoints, setChallengePoints] = useState("100");

  // Internal state
  const [creatorId, setCreatorId] = useState("");
  const [communityId, setCommunityId] = useState("");

  function slugSuggestion(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/, "").slice(0, 40);
  }

  async function submitCreator(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), niche, city: city.trim() || undefined }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Creator creation failed");
      setCreatorId(d.data.creator.id);
      setStep("community");
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function submitCommunity(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const slug = slugSuggestion(clubName);
      const r = await fetch("/api/admin/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId, name: clubName.trim(),
          description: description.trim() || undefined,
          brandColor, isPublic: true,
          customSlug: slug,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Community creation failed");
      const cid = d.data.community.id;
      const cslug = d.data.community.slug;
      setCommunityId(cid);
      const dashUrl = `${window.location.origin}/dashboard/${cid}`;
      const clubUrl = `${window.location.origin}/club/${cslug}`;
      // Persist to localStorage for recovery
      localStorage.setItem("aura_dashboard", JSON.stringify({
        communityId: cid, creatorId, clubName: clubName.trim(),
        slug: cslug, dashboardUrl: dashUrl, createdAt: new Date().toISOString(),
      }));
      setResult({ creatorId, communityId: cid, slug: cslug, clubName: clubName.trim(), brandColor, dashboardUrl: dashUrl, clubUrl });
      setStep("challenge");
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function submitChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeTitle.trim()) { setStep("success"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/admin/challenges/${communityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeTitle.trim(),
          pointsReward: Number(challengePoints) || 100,
          type: "custom",
          verificationMethod: "manual",
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Challenge creation failed");
    } catch (err) { setError((err as Error).message); }
    setStep("success");
    setLoading(false);
  }

  async function copyDashboardUrl() {
    if (!result) return;
    await navigator.clipboard.writeText(result.dashboardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const STEP_LABELS: Record<Step, string> = {
    creator: "About you", community: "Your Club", challenge: "First Challenge", success: "You're live",
  };
  const STEPS: Step[] = ["creator", "community", "challenge", "success"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Progress bar */}
        {step !== "success" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {STEPS.slice(0, 3).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      i < stepIdx ? "bg-[#B8FF4D] text-[#060A08]"
                      : i === stepIdx ? "border-2 border-[#B8FF4D] text-[#B8FF4D]"
                      : "border border-white/20 text-white/20"
                    }`}
                  >
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i === stepIdx ? "text-white/60" : "text-white/20"}`}>
                    {STEP_LABELS[s]}
                  </span>
                  {i < 2 && <div className={`w-8 h-px mx-1 ${i < stepIdx ? "bg-[#B8FF4D]" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Creator */}
        {step === "creator" && (
          <form onSubmit={submitCreator} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black">Who are you?</h1>
              <p className="text-sm text-white/40">Your fans will see this on your club page.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Your name or artist name *</label>
                <input
                  type="text" required autoFocus
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nour, DJ Kilo, @yourname..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Your niche</label>
                <div className="grid grid-cols-4 gap-2">
                  {NICHES.map(n => (
                    <button
                      key={n.value} type="button"
                      onClick={() => setNiche(n.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                        niche === n.value
                          ? "bg-[#B8FF4D] text-[#060A08]"
                          : "bg-[#0B0F0E] border border-[#1e2820] text-white/50 hover:border-white/20"
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">City (optional)</label>
                <input
                  type="text"
                  value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Paris, London, NYC…"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading || !displayName.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {loading ? "Creating…" : "Continue →"}
            </button>
          </form>
        )}

        {/* Step 2: Community */}
        {step === "community" && (
          <form onSubmit={submitCommunity} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black">Name your fan club</h1>
              <p className="text-sm text-white/40">You can change everything later from your dashboard.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Club name *</label>
                <input
                  type="text" required autoFocus
                  value={clubName} onChange={e => setClubName(e.target.value)}
                  placeholder="Nour Inner Circle, Team Kilo…"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]"
                />
                {clubName && (
                  <p className="text-xs text-white/20 mt-1">
                    Club URL: <span className="text-white/40">/club/{slugSuggestion(clubName)}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Description (optional)</label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What makes your community special?"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40] resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-2 block">Brand color</label>
                <div className="flex gap-2 flex-wrap">
                  {BRAND_COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setBrandColor(c)}
                      className={`w-8 h-8 rounded-lg transition-all ${brandColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-[#060A08] scale-110" : "opacity-70 hover:opacity-100"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("creator")}
                className="flex-none px-4 py-3 rounded-xl text-sm text-white/40 border border-[#1e2820] hover:text-white/70 transition-colors">
                ←
              </button>
              <button
                type="submit" disabled={loading || !clubName.trim()}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
              >
                {loading ? "Creating club…" : "Create my Fan Club →"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: First Challenge */}
        {step === "challenge" && result && (
          <form onSubmit={submitChallenge} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black">Add a first challenge</h1>
              <p className="text-sm text-white/40">Give your fans a way to earn points. You can skip this and add more later.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Challenge title</label>
                <input
                  type="text" autoFocus
                  value={challengeTitle} onChange={e => setChallengeTitle(e.target.value)}
                  placeholder="Share a story on Instagram, Visit our partner…"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Points reward</label>
                <div className="grid grid-cols-4 gap-2">
                  {["50", "100", "200", "500"].map(v => (
                    <button key={v} type="button" onClick={() => setChallengePoints(v)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all ${
                        challengePoints === v ? "text-[#060A08]" : "bg-[#0B0F0E] border border-[#1e2820] text-white/50 hover:border-white/20"
                      }`}
                      style={challengePoints === v ? { background: result.brandColor ?? "#B8FF4D" } : {}}>
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="space-y-2">
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
              >
                {loading ? "Saving…" : challengeTitle.trim() ? "Add challenge & Launch →" : "Skip — Launch my club →"}
              </button>
              {!challengeTitle.trim() && (
                <p className="text-xs text-white/20 text-center">You can always add challenges from your dashboard</p>
              )}
            </div>
          </form>
        )}

        {/* Step 4: Success */}
        {step === "success" && result && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl bg-[#B8FF4D18] border border-[#B8FF4D40]">
              🚀
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-[#B8FF4D]">{result.clubName} is live!</h1>
              <p className="text-sm text-white/40">Share your club URL with your audience. Save your dashboard link.</p>
            </div>

            {/* Dashboard URL — critical recovery */}
            <div className="rounded-2xl bg-[#0B0F0E] border border-[#1e2820] p-5 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#B8FF4D]" />
                <p className="text-xs font-bold text-[#B8FF4D] uppercase tracking-wider">Your Creator Dashboard</p>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">
                Bookmark this link. You'll use it to manage your club, approve challenges, and view your fans.
              </p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-white/50 truncate font-mono bg-[#060A08] px-3 py-2 rounded-lg">
                  {result.dashboardUrl}
                </p>
                <button
                  onClick={copyDashboardUrl}
                  className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold text-[#060A08] bg-[#B8FF4D] hover:brightness-110 transition-all"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={result.dashboardUrl}
                className="py-3 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 transition-all text-center"
              >
                Go to Dashboard →
              </a>
              <a
                href={result.clubUrl}
                target="_blank" rel="noopener noreferrer"
                className="py-3 rounded-xl font-bold text-sm border border-[#1e2820] text-white/60 hover:border-[#B8FF4D40] hover:text-white/80 transition-all text-center"
              >
                View Club ↗
              </a>
            </div>

            <div className="rounded-xl bg-[#0B0F0E] border border-[#1e2820] p-4 text-left space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Your fan club URL</p>
              <p className="text-sm font-mono text-[#B8FF4D] break-all">{result.clubUrl}</p>
              <p className="text-xs text-white/30">Share this with your audience to start growing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
