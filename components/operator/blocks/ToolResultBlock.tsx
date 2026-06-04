import type { UIBlock } from "@/lib/operator/types";
import { Info } from "lucide-react";

interface ToolResultBlockProps {
  block: UIBlock;
}

interface FieldItem {
  key: string;
  value: string;
}

export function ToolResultBlock({ block }: ToolResultBlockProps) {
  const { title, data } = block;
  const fields: FieldItem[] = (data.fields as FieldItem[]) || [];
  const label = data.label as string | undefined;
  const overview = data.overview as string | undefined;
  const currentMode = data.currentMode as string | undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-lime-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
      </div>
      {label && <p className="mb-2 text-sm font-medium text-slate-200">{label}</p>}
      {overview && <p className="mb-2 text-xs text-slate-300">{overview}</p>}
      {currentMode && (
        <p className="mb-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400">{currentMode}</p>
      )}
      {fields.length > 0 && (
        <div className="flex flex-col gap-1">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1">
              <span className="text-[11px] text-slate-400">{f.key}</span>
              <span className="text-[11px] font-medium text-slate-200">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
