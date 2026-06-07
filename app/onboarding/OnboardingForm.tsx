"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const skipCreator = searchParams.get("skipCreator") === "1";

  const [step, setStep] = useState<Step>("creator");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(skipCreator);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Step 1 — creator + auth
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // If skipCreator=1, the user already signed up via /auth — fetch their session
  useEffect(() => {
    if (!skipCreator) return;
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCreatorId(d.data.creator.id);
          setDisplayName(d.data.creator.displayName ?? "");
          setStep("community");
        } else {
          // Session expired or missing — fall back to creator step
          setStep("creator");
        }
      })
      .catch(() => setStep("creator"))
      .finally(() => setBootstrapping(false));
  }, [skipCreator]);

  function slugSuggestion(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/, "").slice(0, 40);
  }

  async function submitCreator(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          niche,
          city: city.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Account creation failed");
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
    creator: "Your account", community: "Your Club", challenge: "First Challenge", success: "You're live",
  };
  const STEPS: Step[] = ["creator", "community", "challenge", "success"];
  const stepIdx = STEPS.indexOf(step);

  const inputCls = "w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40]";

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-[#060A08] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#B8FF4D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Progress bar */}
        {step !== "success" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {(skipCreator ? STEPS.slice(1, 3) : STEPS.slice(0, 3)).map((s, i) => {
                const realIdx = skipCreator ? i + 1 : i;
                const isActive = s === step;
                const isPast = STEPS.indexOf(s) < stepIdx;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                        isPast ? "bg-[#B8FF4D] text-[#060A08]"
                        : isActive ? "border-2 border-[#B8FF4D] text-[#B8FF4D]"
                        : "border border-white/20 text-white/20"
                      }`}
                    >
                      {isPast ? "✓" : realIdx + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline ${isActive ? "text-white/60" : "text-white/20"}`}>
                      {STEP_LABELS[s]}
                    </span>
                    {i < (skipCreator ? 1 : 2) && <div className={`w-8 h-px mx-1 ${isPast ? "bg-[#B8FF4D]" : "bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Creator + Account */}
        {step === "creator" && (
          <form onSubmit={submitCreator} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black">Create your account</h1>
              <p className="text-sm text-white/40">Your fans will see your name. Your email stays private.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Your name or artist name *</label>
                <input
                  type="text" required autoFocus
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nour, DJ Kilo, @yourname..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Email address *</label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Password *</label>
                <input
                  type="password" required minLength={8}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputCls}
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
                  className={inputCls}
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="space-y-3">
              <button
                type="submit" disabled={loading || !displayName.trim() || !email.trim() || password.length < 8}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
              >
                {loading ? "Creating account…" : "Continue →"}
              </button>
              <p className="text-xs text-white/30 text-center">
                Already have an account?{" "}
                <a href="/auth" className="text-white/50 underline hover:text-white/70">Log in</a>
              </p>
            </div>
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
                  className={inputCls}
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
              {!skipCreator && (
                <button type="button" onClick={() => setStep("creator")}
                  className="flex-none px-4 py-3 rounded-xl text-sm text-white/40 border border-[#1e2820] hover:text-white/70 transition-colors">
                  ←
                </button>
              )}
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
                  className={inputCls}
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
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-[#B8FF4D]">{result.clubName} is live!</h1>
              <p className="text-sm text-white/40">Your fan club is ready. Share the link and start growing.</p>
            </div>

            <a
              href={result.dashboardUrl}
              className="block w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 transition-all text-center"
            >
              Go to Dashboard →
            </a>

            <div className="rounded-xl bg-[#0B0F0E] border border-[#1e2820] p-4 text-left space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Your fan club URL</p>
              <p className="text-sm font-mono text-[#B8FF4D] break-all">{result.clubUrl}</p>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-white/30">Share with your audience to start growing.</p>
                <a href={result.clubUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white/40 hover:text-white/70 underline shrink-0 ml-2">
                  Preview ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
