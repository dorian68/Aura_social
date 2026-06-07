"use client";
import { useEffect, useState } from "react";

interface Community { id: string; slug: string; name: string; brandColor: string }
interface Creator { id: string; email: string; displayName: string; niche: string | null }

export default function AuthNav() {
  const [state, setState] = useState<"loading" | "guest" | "creator">("loading");
  const [creator, setCreator] = useState<Creator | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCreator(d.data.creator);
          setCommunities(d.data.communities ?? []);
          setState("creator");
        } else {
          setState("guest");
        }
      })
      .catch(() => setState("guest"));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (state === "loading") {
    return <div className="w-24 h-7 rounded-lg bg-[#1e2820] animate-pulse" />;
  }

  if (state === "guest") {
    return (
      <div className="flex items-center gap-2">
        <a href="/auth" className="text-xs text-white/50 hover:text-white/80 transition-colors hidden sm:inline">
          Log in
        </a>
        <a
          href="/onboarding"
          className="px-4 py-2 rounded-xl font-bold text-xs text-[#060A08] bg-[#B8FF4D] hover:brightness-110 transition-all"
        >
          Launch Club
        </a>
      </div>
    );
  }

  const initials = (creator?.displayName ?? "?").slice(0, 2).toUpperCase();
  const firstCommunity = communities[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1e2820] hover:border-[#B8FF4D40] transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-[#B8FF4D22] border border-[#B8FF4D40] text-[#B8FF4D] text-xs font-bold flex items-center justify-center">
          {initials}
        </span>
        <span className="text-xs text-white/60 max-w-[120px] truncate hidden sm:inline">
          {creator?.displayName}
        </span>
        <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[#1e2820] bg-[#0B0F0E] shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e2820]">
            <p className="text-xs font-semibold text-[#FFF7E8] truncate">{creator?.displayName}</p>
            <p className="text-xs text-white/30 truncate">{creator?.email}</p>
          </div>
          {communities.length > 0 && (
            <div className="py-1">
              {communities.map(c => (
                <a
                  key={c.id}
                  href={`/dashboard/${c.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-white/60 hover:text-white/90 hover:bg-[#1e2820] transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded text-center font-bold text-[10px] leading-4"
                    style={{ background: c.brandColor + "33", color: c.brandColor }}
                  >
                    {c.name.charAt(0)}
                  </span>
                  <span className="truncate">{c.name}</span>
                </a>
              ))}
            </div>
          )}
          {firstCommunity && (
            <div className="border-t border-[#1e2820] py-1">
              <a
                href={`/club/${firstCommunity.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-xs text-white/40 hover:text-white/70 hover:bg-[#1e2820] transition-colors"
              >
                View club page ↗
              </a>
            </div>
          )}
          <div className="border-t border-[#1e2820] py-1">
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-xs text-white/40 hover:text-red-400 hover:bg-[#1e2820] transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
