"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "login" | "signup";

export default function AuthForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "";

  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Login failed");
      const firstCommunity = d.data.communities?.[0];
      const target = nextUrl || (firstCommunity ? `/dashboard/${firstCommunity.id}` : "/onboarding");
      window.location.href = target;
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, password: signupPassword, displayName: signupName }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Signup failed");
      window.location.href = "/onboarding?skipCreator=1";
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-[#0B0F0E] border border-[#1e2820] text-sm placeholder-white/20 focus:outline-none focus:border-[#B8FF4D40] text-[#FFF7E8]";

  return (
    <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-1">
          <a href="/" className="text-2xl font-black inline-block">
            <span className="text-[#B8FF4D]">Aura</span> Superfan
          </a>
          <p className="text-sm text-white/40">Creator account</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-[#0B0F0E] border border-[#1e2820] p-1">
          {(["login", "signup"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? "bg-[#B8FF4D] text-[#060A08]" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <input
                type="email" required autoFocus
                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Password</label>
              <input
                type="password" required
                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {loading ? "Logging in…" : "Log in →"}
            </button>
          </form>
        )}

        {/* Signup form */}
        {tab === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Your name or artist name</label>
              <input
                type="text" required autoFocus
                value={signupName} onChange={e => setSignupName(e.target.value)}
                placeholder="Nour, DJ Kilo…"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <input
                type="email" required
                value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Password (min 8 characters)</label>
              <input
                type="password" required minLength={8}
                value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {loading ? "Creating account…" : "Create account →"}
            </button>
            <p className="text-xs text-white/30 text-center">
              You'll be redirected to set up your fan club.
            </p>
          </form>
        )}

        <p className="text-xs text-center text-white/20">
          {tab === "login"
            ? <>No account? <button onClick={() => setTab("signup")} className="text-[#B8FF4D] hover:underline">Create one →</button></>
            : <>Already have one? <button onClick={() => setTab("login")} className="text-[#B8FF4D] hover:underline">Log in →</button></>
          }
        </p>
      </div>
    </div>
  );
}
