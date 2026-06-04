import type { UIBlock } from "@/lib/operator/types";
import { ShieldCheck } from "lucide-react";

interface AuditEventBlockProps {
  block: UIBlock;
}

interface AuditEvent {
  action: string;
  severity?: string;
  message?: string;
  createdAt?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-lime-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export function AuditEventBlock({ block }: AuditEventBlockProps) {
  const { title, data } = block;
  const events: AuditEvent[] = (data.events as AuditEvent[]) || [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-lime-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-slate-500">No audit events yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {events.map((e, i) => (
            <div key={i} className="rounded bg-white/[0.03] px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-200">{e.action}</span>
                <span className={`text-[10px] ${SEVERITY_COLORS[e.severity || "info"] || "text-slate-400"}`}>
                  {e.severity || "info"}
                </span>
              </div>
              {e.message && (
                <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{e.message}</p>
              )}
              {e.createdAt && (
                <p className="mt-0.5 text-[9px] text-slate-500">
                  {new Date(e.createdAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
