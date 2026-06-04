import type { UIBlock } from "@/lib/operator/types";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";

interface ActionPlanBlockProps {
  block: UIBlock;
}

interface ActionItem {
  label?: string;
  action?: string;
  title?: string;
  priority?: string;
  message?: string;
  suggestedAction?: string;
  channel?: string;
  messageSummary?: string;
  cta?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-slate-400",
};

export function ActionPlanBlock({ block }: ActionPlanBlockProps) {
  const { title, data } = block;
  const items: ActionItem[] = (data.items as ActionItem[]) || [];
  const count = data.count as number | undefined;
  const simulated = data.simulated as boolean | undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
        {count !== undefined && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-slate-400">
            {count}
          </span>
        )}
      </div>
      {simulated && (
        <p className="mb-2 text-[10px] text-amber-400/80">Simulation — requires approval before execution</p>
      )}
      <div className="flex flex-col gap-2">
        {items.slice(0, 5).map((item, i) => {
          const text = item.title || item.label || item.suggestedAction || item.action || "";
          const sub = item.message || item.messageSummary || item.action || "";
          const priority = item.priority;
          return (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400/60" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200">{text}</span>
                  {priority && (
                    <span className={`text-[10px] font-semibold ${PRIORITY_COLORS[priority] || "text-slate-400"}`}>
                      {priority.toUpperCase()}
                    </span>
                  )}
                </div>
                {sub && sub !== text && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{sub}</p>
                )}
                {item.channel && (
                  <span className="mt-1 inline-block rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                    {item.channel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
