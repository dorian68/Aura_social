"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "login" | "signup";
type LoginMode = "credentials" | "forgot" | "forgot_sent";

export default function AuthForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "";

  const [tab, setTab] = useState<Tab>("login");
  const [loginMode, setLoginMode] = useState<LoginMode>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState("");

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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message ?? "Request failed");
      setLoginMode("forgot_sent");
      setForgotSuccess(forgotEmail);
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  function switchTab(t: Tab) { setTab(t); setError(""); setLoginMode("credentials"); }

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
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? "bg-[#B8FF4D] text-[#060A08]" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === "login" && loginMode === "credentials" && (
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/40">Password</label>
                <button
                  type="button"
                  onClick={() => { setLoginMode("forgot"); setForgotEmail(loginEmail); setError(""); }}
                  className="text-xs text-white/30 hover:text-[#B8FF4D] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
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

        {/* Forgot password form */}
        {tab === "login" && loginMode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Reset your password</p>
              <p className="text-xs text-white/40">Enter your email and we'll send a reset link.</p>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <input
                type="email" required autoFocus
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {loading ? "Sending…" : "Send reset link →"}
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode("credentials"); setError(""); }}
              className="w-full text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              ← Back to log in
            </button>
          </form>
        )}

        {/* Forgot password sent confirmation */}
        {tab === "login" && loginMode === "forgot_sent" && (
          <div className="space-y-4 text-center">
            <div className="py-4 space-y-3">
              <div className="text-3xl">✉️</div>
              <p className="text-sm font-semibold">Check your inbox</p>
              <p className="text-xs text-white/40">
                If <span className="text-white/60">{forgotSuccess}</span> is registered,
                a reset link was sent. Check your server console in dev mode.
              </p>
            </div>
            <button
              onClick={() => { setLoginMode("credentials"); setError(""); }}
              className="w-full py-3 rounded-xl font-bold text-sm border border-[#1e2820] text-white/50 hover:text-white/80 transition-colors"
            >
              Back to log in
            </button>
          </div>
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
          {tab === "login" && loginMode === "credentials"
            ? <>No account? <button onClick={() => switchTab("signup")} className="text-[#B8FF4D] hover:underline">Create one →</button></>
            : tab === "signup"
            ? <>Already have one? <button onClick={() => switchTab("login")} className="text-[#B8FF4D] hover:underline">Log in →</button></>
            : null
          }
        </p>
      </div>
    </div>
  );
}
