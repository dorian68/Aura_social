import type { UIBlock } from "@/lib/operator/types";
import { CreditCard } from "lucide-react";

interface FanPassBlockProps {
  block: UIBlock;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "text-amber-600 border-amber-600/30 bg-amber-600/[0.06]",
  silver: "text-slate-300 border-slate-300/30 bg-slate-300/[0.06]",
  gold: "text-yellow-400 border-yellow-400/30 bg-yellow-400/[0.06]",
  vip: "text-purple-400 border-purple-400/30 bg-purple-400/[0.06]",
  inner_circle: "text-lime-400 border-lime-400/30 bg-lime-400/[0.06]",
  event: "text-pink-400 border-pink-400/30 bg-pink-400/[0.06]",
};

export function FanPassBlock({ block }: FanPassBlockProps) {
  const { data } = block;
  const tier = String(data.tier || "gold");
  const tierClass = TIER_COLORS[tier] || TIER_COLORS.gold;
  const benefits: string[] = (data.benefits as string[]) || [];
  const simulated = data.simulated as boolean | undefined;

  return (
    <div className={`rounded-xl border p-4 ${tierClass}`}>
      <div className="mb-2 flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-widest">{tier} Pass</span>
        {simulated && (
          <span className="ml-auto text-[10px] text-amber-400/80">[SIM]</span>
        )}
      </div>
      <p className="text-sm font-bold text-white">{String(data.name || "Fan Pass")}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-sm font-semibold text-white">
          €{String(data.price || 0)} {String(data.currency || "EUR")}
        </span>
        <span className="text-[11px] text-slate-400">
          {String(data.holders || 0)}/{String(data.supply || 0)} holders
        </span>
      </div>
      {data.estimatedRevenue !== undefined && (
        <div className="mt-2 rounded bg-black/20 px-2 py-1 text-[11px] text-slate-300">
          Est. revenue: €{Number(data.estimatedRevenue).toFixed(2)} · {String(data.estimatedHolders || 0)} holders
        </div>
      )}
      {benefits.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {benefits.slice(0, 3).map((b, i) => (
            <span key={i} className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] text-slate-300">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
