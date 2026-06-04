import type { ReactNode } from "react";
import type { UIBlock } from "@/lib/operator/types";
import { Activity, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface HealthStatusBlockProps {
  block: UIBlock;
}

interface Integration {
  key: string;
  label: string;
  status: string;
  mode: string;
}

interface ContractItem {
  name: string;
  abiLoaded: boolean;
  functionCount: number;
  status: string;
}

const STATUS_ICONS: Record<string, ReactNode> = {
  ready: <CheckCircle className="h-3 w-3 text-lime-400" />,
  mock_ready: <CheckCircle className="h-3 w-3 text-lime-400" />,
  error: <XCircle className="h-3 w-3 text-red-400" />,
  missing_config: <AlertCircle className="h-3 w-3 text-amber-400" />,
  disabled: <AlertCircle className="h-3 w-3 text-slate-500" />,
  healthy: <CheckCircle className="h-3 w-3 text-lime-400" />,
  degraded: <AlertCircle className="h-3 w-3 text-amber-400" />,
};

const STATUS_LABEL_COLORS: Record<string, string> = {
  ready: "text-lime-400",
  mock_ready: "text-lime-400",
  healthy: "text-lime-400",
  error: "text-red-400",
  missing_config: "text-amber-400",
  disabled: "text-slate-500",
  degraded: "text-amber-400",
};

export function HealthStatusBlock({ block }: HealthStatusBlockProps) {
  const { title, data } = block;
  const integrations: Integration[] = (data.integrations as Integration[]) || [];
  const contracts: ContractItem[] = (data.contracts as ContractItem[]) || [];
  const score = data.score != null ? Number(data.score) : undefined;
  const status = data.status != null ? String(data.status) : undefined;
  const name = data.name != null ? String(data.name) : null;
  const plan = data.plan != null ? String(data.plan) : null;
  const mode = data.mode != null ? String(data.mode) : null;
  const liveChain = data.liveChain != null ? String(data.liveChain) : null;
  const mainnet = data.mainnet != null ? String(data.mainnet) : "Disabled";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-lime-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
        {score !== undefined && (
          <span className={`ml-auto text-xs font-bold ${
            score >= 80 ? "text-lime-400" : score >= 50 ? "text-amber-400" : "text-red-400"
          }`}>
            {score}%
          </span>
        )}
        {status && STATUS_ICONS[status] && (
          <span className="ml-auto">{STATUS_ICONS[status]}</span>
        )}
      </div>

      {name && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium text-white">{name}</span>
          {plan && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">
              {plan}
            </span>
          )}
        </div>
      )}

      {mode && <p className="mb-2 text-xs text-slate-400">Mode: {mode}</p>}

      {liveChain && (
        <div className="mb-2 rounded bg-white/[0.03] px-2 py-1.5 text-[11px] text-slate-300">
          Live chain: {liveChain} · Mainnet: {mainnet}
        </div>
      )}

      {integrations.length > 0 && (
        <div className="flex flex-col gap-1">
          {integrations.slice(0, 6).map((ig, i) => (
            <div key={i} className="flex items-center gap-2 rounded bg-white/[0.03] px-2 py-1">
              {STATUS_ICONS[ig.status] || <AlertCircle className="h-3 w-3 text-slate-500" />}
              <span className="flex-1 text-[11px] text-slate-300">{ig.label}</span>
              <span className={`text-[10px] font-medium ${STATUS_LABEL_COLORS[ig.status] || "text-slate-400"}`}>
                {ig.status}
              </span>
              <span className="text-[9px] text-slate-500">{ig.mode}</span>
            </div>
          ))}
        </div>
      )}

      {contracts.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {contracts.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded bg-white/[0.03] px-2 py-1">
              {c.abiLoaded ? (
                <CheckCircle className="h-3 w-3 text-lime-400" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400" />
              )}
              <span className="flex-1 text-[11px] text-slate-300">{c.name}</span>
              <span className="text-[10px] text-slate-400">{c.functionCount} fns</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
