"use client";
import { useState } from "react";

export default function RedeemButton({
  slug,
  rewardId,
  pointsCost,
  brandColor,
}: {
  slug: string;
  rewardId: string;
  pointsCost: number;
  brandColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`/api/club/${slug}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, rewardId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Redemption failed");
      setStatus("success");
      setMsg("Requested! The creator will fulfil it shortly.");
    } catch (err) {
      setStatus("error");
      setMsg((err as Error).message);
    }
  }

  function reset() {
    setOpen(false);
    setStatus("idle");
    setMsg("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full py-2 rounded-lg text-xs font-bold text-[#060A08] hover:brightness-110 active:scale-[0.97] transition-all"
        style={{ background: brandColor }}
      >
        Redeem — {pointsCost} pts
      </button>
    );
  }

  if (status === "success") {
    return (
      <div className="mt-2 px-3 py-2.5 rounded-lg border text-xs text-center space-y-1"
        style={{ background: brandColor + "12", borderColor: brandColor + "40", color: brandColor }}>
        <p className="font-bold">✓ {msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleRedeem} className="mt-2 space-y-2">
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full px-3 py-2 rounded-lg bg-[#060A08] border border-[#1e2820] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
      />
      {status === "error" && <p className="text-red-400 text-xs">{msg}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex-1 py-2 rounded-lg text-xs text-white/40 border border-[#1e2820] hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-[#060A08] disabled:opacity-50 hover:brightness-110 transition-all"
          style={{ background: brandColor }}
        >
          {status === "loading" ? "…" : `Confirm — ${pointsCost} pts`}
        </button>
      </div>
    </form>
  );
}
