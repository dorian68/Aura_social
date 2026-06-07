"use client";
import { useState } from "react";

interface JoinResult {
  fanId: string;
  displayName: string;
  balance: number;
  justEarned: number;
  referralLink: string;
}

export default function JoinForm({
  slug,
  initialReferralCode,
  brandColor,
}: {
  slug: string;
  initialReferralCode?: string;
  brandColor: string;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [result, setResult] = useState<JoinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/club/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: displayName.trim() || undefined, city: city.trim() || undefined, referralCode: initialReferralCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Something went wrong. Try again.");
      }
      const d = json.data;
      if (d.alreadyMember) {
        setResult({ fanId: d.fan.id, displayName: d.fan.displayName, balance: d.points, justEarned: 0, referralLink: "" });
        setStatus("already");
      } else {
        const refLink = `${window.location.origin}/club/${d.membership.referralLink}`;
        setResult({ fanId: d.fan.id, displayName: d.fan.displayName, balance: d.points.balance, justEarned: d.points.justEarned, referralLink: refLink });
        setStatus("success");
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus("error");
    }
  }

  async function copyLink() {
    if (!result?.referralLink) return;
    await navigator.clipboard.writeText(result.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "success" && result) {
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <p className="text-xl font-bold">You&apos;re in, {result.displayName}!</p>
          <p className="text-sm text-white/50 mt-1">Welcome to the club</p>
        </div>
        <div
          className="inline-flex items-center gap-3 rounded-2xl px-6 py-4"
          style={{ background: brandColor + "18", border: `1px solid ${brandColor}35` }}
        >
          <span className="text-3xl font-black" style={{ color: brandColor }}>+{result.justEarned}</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white/80">points earned</p>
            <p className="text-xs text-white/40">Balance: {result.balance} pts</p>
          </div>
        </div>
        {result.referralLink && (
          <div className="space-y-2">
            <p className="text-xs text-white/40">Invite friends — earn 100 pts per referral</p>
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] hover:border-white/20 text-sm transition-colors"
            >
              <span className="truncate text-white/60 text-xs">{result.referralLink}</span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: copied ? brandColor : undefined }}>
                {copied ? "✓ Copied" : "Copy"}
              </span>
            </button>
          </div>
        )}
        <a
          href={`/fan/${result.fanId}`}
          className="block w-full text-center py-3 rounded-xl border text-sm font-semibold transition-colors hover:border-white/30 text-white/60 hover:text-white/90"
          style={{ borderColor: brandColor + "40" }}
        >
          Mon profil &amp; connecter mes réseaux →
        </a>
      </div>
    );
  }

  if (status === "already" && result) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">👋</div>
        <p className="text-lg font-bold">Welcome back, {result.displayName}!</p>
        <p className="text-sm text-white/50">You have {result.balance} points in this club.</p>
        <a
          href={`/fan/${result.fanId}`}
          className="block w-full text-center py-3 rounded-xl border text-sm font-semibold text-white/60 hover:text-white/90 hover:border-white/30 transition-colors"
          style={{ borderColor: brandColor + "40" }}
        >
          Mon profil &amp; réseaux connectés →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email" required autoComplete="email"
        value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
      />
      <input
        type="text" autoComplete="name"
        value={displayName} onChange={e => setDisplayName(e.target.value)}
        placeholder="Your name (optional)"
      />
      <input
        type="text" autoComplete="address-level2"
        value={city} onChange={e => setCity(e.target.value)}
        placeholder="Your city (optional)"
      />
      {status === "error" && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl py-3.5 font-bold text-[#060A08] text-sm disabled:opacity-50 hover:brightness-110 active:scale-[0.98] transition-all"
        style={{ background: brandColor }}
      >
        {status === "loading" ? "Joining…" : "Join the Club — It's Free"}
      </button>
      <p className="text-xs text-white/30 text-center">No spam, no credit card. Ever.</p>
    </form>
  );
}
