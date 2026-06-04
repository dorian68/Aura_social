import type { UIBlock } from "@/lib/operator/types";
import { Coins, AlertTriangle, CheckCircle } from "lucide-react";

interface TokenEconomyBlockProps {
  block: UIBlock;
}

export function TokenEconomyBlock({ block }: TokenEconomyBlockProps) {
  const { title, data } = block;
  const risks: string[] = (data.risks as string[]) || (data.errors as string[]) || [];
  const warnings: string[] = (data.warnings as string[]) || [];
  const simulated = data.simulated as boolean | undefined;
  const rawScore = data.score ?? data.readinessScore;
  const displayScore = rawScore != null ? Number(rawScore) : undefined;
  const label = data.label != null ? String(data.label) : data.readinessLabel != null ? String(data.readinessLabel) : null;
  const totalSupply = data.totalSupply != null ? Number(data.totalSupply) : null;
  const tokenizationMode = data.tokenizationMode != null ? String(data.tokenizationMode) : null;
  const explanation = data.explanation != null ? String(data.explanation) : null;
  const disclaimer = data.disclaimer != null ? String(data.disclaimer) : null;
  const pools = data.pools as Record<string, number> | undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-lime-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
        {simulated && (
          <span className="ml-auto text-[10px] text-amber-400/80">[SIMULATION]</span>
        )}
      </div>

      {displayScore !== undefined && (
        <div className="mb-3 flex items-center gap-3">
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={displayScore >= 75 ? "#a3e635" : displayScore >= 45 ? "#facc15" : "#f87171"}
                strokeWidth="3"
                strokeDasharray={`${displayScore} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {displayScore}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Readiness: {displayScore}/100</p>
            {label && <p className="text-[10px] text-slate-400">{label}</p>}
          </div>
        </div>
      )}

      {totalSupply != null && (
        <div className="mb-2 text-[11px] text-slate-400">
          Supply: {totalSupply.toLocaleString()}
          {tokenizationMode && ` · Mode: ${tokenizationMode}`}
        </div>
      )}

      {pools && (
        <div className="mb-3 rounded-lg bg-white/[0.03] px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Pool Allocations</p>
          {Object.entries(pools).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-0.5">
              <span className="text-[10px] text-slate-400">{key}</span>
              <span className="text-[10px] font-medium text-slate-200">{Number(val).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {explanation && (
        <p className="mb-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-300">
          {explanation}
        </p>
      )}

      {risks.length > 0 && (
        <div className="mb-2">
          {risks.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 py-0.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
              <span className="text-[11px] text-red-300">{r}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 py-0.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              <span className="text-[11px] text-amber-300">{w}</span>
            </div>
          ))}
        </div>
      )}

      {risks.length === 0 && warnings.length === 0 && displayScore !== undefined && (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-lime-400" />
          <span className="text-[11px] text-lime-400">No critical risks detected.</span>
        </div>
      )}

      {disclaimer && (
        <p className="mt-2 text-[9px] italic text-slate-500">{disclaimer}</p>
      )}
    </div>
  );
}
