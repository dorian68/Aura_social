"use client";

import { MessageSquare } from "lucide-react";

interface OperatorLauncherProps {
  onClick: () => void;
  hasMessages: boolean;
}

export function OperatorLauncher({ onClick, hasMessages }: OperatorLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Aura Operator"
      className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-lime-500/30 bg-[#0a0a0f] shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:border-lime-500/50 hover:shadow-[0_8px_32px_rgba(163,230,53,0.15)] transition-all duration-300"
    >
      <div className="absolute inset-0 rounded-full bg-lime-500/[0.06] group-hover:bg-lime-500/[0.1] transition" />
      <MessageSquare className="relative h-5 w-5 text-lime-400" />
      {hasMessages && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#0a0a0f] bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.8)]" />
      )}
    </button>
  );
}
