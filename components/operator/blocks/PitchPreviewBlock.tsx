import type { UIBlock } from "@/lib/operator/types";
import { MessageSquare, AlertTriangle } from "lucide-react";

interface PitchPreviewBlockProps {
  block: UIBlock;
}

export function PitchPreviewBlock({ block }: PitchPreviewBlockProps) {
  const { data } = block;
  const simulated = data.simulated as boolean | undefined;
  const businessName = data.businessName != null ? String(data.businessName) : null;
  const subject = data.subject != null ? String(data.subject) : null;
  const message = data.message != null ? String(data.message) : null;
  const tone = data.tone != null ? String(data.tone) : null;
  const channel = data.channel != null ? String(data.channel) : null;
  const approvalRequired = data.approvalRequired as boolean | undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-purple-400">Pitch Draft</span>
        {simulated && (
          <span className="ml-auto text-[10px] text-amber-400/80">[SIMULATION]</span>
        )}
      </div>

      {businessName && (
        <p className="mb-1 text-[11px] text-slate-400">For: {businessName}</p>
      )}

      {subject && (
        <p className="mb-2 text-xs font-semibold text-white">{subject}</p>
      )}

      {message && (
        <p className="mb-3 text-[11px] leading-relaxed text-slate-300 line-clamp-4">{message}</p>
      )}

      <div className="flex items-center gap-2">
        {tone && (
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">
            Tone: {tone}
          </span>
        )}
        {channel && (
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">
            {channel}
          </span>
        )}
        {approvalRequired && (
          <div className="ml-auto flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-amber-400">Approval required</span>
          </div>
        )}
      </div>
    </div>
  );
}
