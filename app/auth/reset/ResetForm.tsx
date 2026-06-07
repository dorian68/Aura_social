"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-4xl">🔗</p>
          <p className="text-sm text-white/40">This reset link is invalid or has expired.</p>
          <a href="/auth" className="text-xs text-[#B8FF4D] underline">Back to log in</a>
        </div>
      </div>
    );
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Reset failed");
      setDone(true);
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40] text-[#FFF7E8]";

  if (done) {
    return (
      <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-xs">
          <div className="text-4xl">✅</div>
          <p className="font-bold">Password updated!</p>
          <p className="text-sm text-white/40">You can now log in with your new password.</p>
          <a href="/auth" className="block w-full py-3 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] text-center hover:brightness-110 transition-all">
            Log in →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <a href="/" className="text-2xl font-black inline-block">
            <span className="text-[#B8FF4D]">Aura</span> Superfan
          </a>
          <p className="text-sm text-white/40">Set a new password</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">New password</label>
            <input
              type="password" required minLength={8} autoFocus
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Confirm password</label>
            <input
              type="password" required minLength={8}
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Same password again"
              className={inputCls}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {loading ? "Updating…" : "Set new password →"}
          </button>
        </form>
      </div>
    </div>
  );
}
