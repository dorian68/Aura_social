"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <button
      onClick={logout}
      className="text-xs px-3 py-1.5 rounded-lg border border-[#1e2820] text-white/40 hover:text-red-400 hover:border-red-400/30 transition-colors shrink-0"
    >
      Log out
    </button>
  );
}
