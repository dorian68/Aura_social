import type { UIBlock } from "@/lib/operator/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPIBlockProps {
  block: UIBlock;
}

interface MetricItem {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable";
}

export function KPIBlock({ block }: KPIBlockProps) {
  const { title, data } = block;
  const metrics: MetricItem[] = (data.metrics as MetricItem[]) || [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-lg bg-white/[0.04] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{m.label}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">{m.value}</span>
              {m.trend === "up" && <TrendingUp className="h-3 w-3 text-lime-400" />}
              {m.trend === "down" && <TrendingDown className="h-3 w-3 text-red-400" />}
              {m.trend === "stable" && <Minus className="h-3 w-3 text-slate-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
