import type { UIBlock } from "@/lib/operator/types";
import { Gift } from "lucide-react";

interface RewardCardBlockProps {
  block: UIBlock;
}

export function RewardCardBlock({ block }: RewardCardBlockProps) {
  const { data } = block;
  const name = data.name != null ? String(data.name) : "";
  const description = data.description != null ? String(data.description) : null;
  const costInPoints = data.costInPoints != null ? Number(data.costInPoints) : 0;
  const rewardType = data.rewardType != null ? String(data.rewardType) : "custom";
  const stock = data.stock != null ? Number(data.stock) : null;
  const redeemedCount = data.redeemedCount != null ? Number(data.redeemedCount) : 0;
  const status = data.status != null ? String(data.status) : "draft";

  return (
    <div className="rounded-xl border border-lime-500/20 bg-lime-500/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Gift className="h-4 w-4 text-lime-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-lime-400">Reward</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          status === "active" ? "bg-lime-500/20 text-lime-400" : "bg-white/10 text-slate-400"
        }`}>
          {status}
        </span>
      </div>
      <p className="text-sm font-bold text-white">{name}</p>
      {description && (
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <div className="rounded-lg bg-lime-500/10 px-3 py-1.5">
          <span className="text-xs font-semibold text-lime-400">{costInPoints} pts</span>
        </div>
        <span className="text-[10px] text-slate-500">{rewardType}</span>
        {stock !== null && (
          <span className="ml-auto text-[10px] text-slate-500">
            {redeemedCount}/{stock} redeemed
          </span>
        )}
      </div>
    </div>
  );
}
