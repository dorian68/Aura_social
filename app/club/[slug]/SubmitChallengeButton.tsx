"use client";
import { useState } from "react";

export default function SubmitChallengeButton({
  slug,
  challengeId,
  pointsReward,
  brandColor,
}: {
  slug: string;
  challengeId: string;
  pointsReward: number;
  brandColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [proof, setProof] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [pts, setPts] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const r = await fetch(`/api/club/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, challengeId, proofText: proof || undefined }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Submission failed");
      if (d.data.alreadySubmitted) {
        setStatus("already");
        setMsg(`Already submitted — status: ${d.data.status}`);
        return;
      }
      if (d.data.autoApproved) {
        setStatus("success");
        setPts(d.data.pointsEarned);
        setMsg(`+${d.data.pointsEarned} pts earned!`);
      } else {
        setStatus("success");
        setMsg(d.data.message ?? "Submitted! Waiting for approval.");
      }
    } catch (err) {
      setStatus("error");
      setMsg((err as Error).message);
    }
  }

  function reset() {
    setOpen(false);
    setStatus("idle");
    setMsg("");
    setProof("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full py-2 rounded-lg text-xs font-bold border transition-all hover:brightness-110 active:scale-[0.97]"
        style={{ borderColor: brandColor + "60", color: brandColor }}
      >
        Submit — earn +{pointsReward} pts
      </button>
    );
  }

  if (status === "success") {
    return (
      <div className="mt-2 px-3 py-2.5 rounded-lg border text-xs text-center"
        style={{ background: brandColor + "12", borderColor: brandColor + "40", color: brandColor }}>
        <p className="font-bold">✓ {msg}</p>
        {pts > 0 && <p className="text-xs opacity-70 mt-0.5">Points added to your balance</p>}
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="mt-2 px-3 py-2.5 rounded-lg border text-xs text-center border-[#1e2820] text-white/40">
        ↺ {msg}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <input
        type="email" required autoComplete="email"
        value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com (to identify you)"
        className="w-full px-3 py-2 rounded-lg bg-[#060A08] border border-[#1e2820] text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
      />
      <input
        type="text"
        value={proof} onChange={e => setProof(e.target.value)}
        placeholder="Proof link or description (optional)"
        className="w-full px-3 py-2 rounded-lg bg-[#060A08] border border-[#1e2820] text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
      />
      {status === "error" && <p className="text-red-400 text-xs">{msg}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={reset}
          className="flex-1 py-2 rounded-lg text-xs text-white/40 border border-[#1e2820] hover:text-white/70 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={status === "loading"}
          className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:brightness-110"
          style={{ background: brandColor, color: "#060A08" }}>
          {status === "loading" ? "…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
