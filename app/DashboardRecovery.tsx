"use client";
import { useEffect, useState } from "react";

interface SavedDashboard {
  communityId: string;
  clubName: string;
  dashboardUrl: string;
}

export default function DashboardRecovery() {
  const [saved, setSaved] = useState<SavedDashboard | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aura_dashboard");
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  if (!saved) return null;

  return (
    <a
      href={saved.dashboardUrl}
      className="text-xs px-3 py-1.5 rounded-lg border border-[#1e2820] text-white/50 hover:text-white/80 hover:border-[#B8FF4D40] transition-colors truncate max-w-[140px]"
      title={`My Dashboard — ${saved.clubName}`}
    >
      My Dashboard
    </a>
  );
}
