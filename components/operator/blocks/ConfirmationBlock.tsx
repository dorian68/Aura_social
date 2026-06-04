import type { UIBlock } from "@/lib/operator/types";
import { AlertTriangle } from "lucide-react";

interface ConfirmationBlockProps {
  block: UIBlock;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ConfirmationBlock({ block, onConfirm, onCancel }: ConfirmationBlockProps) {
  const { data } = block;
  const warning = data.warning != null ? String(data.warning) : null;
  const tool = data.tool != null ? String(data.tool) : null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Confirmation Required</span>
      </div>
      {warning && (
        <p className="mb-3 text-xs text-amber-300">{warning}</p>
      )}
      {tool && (
        <p className="mb-2 text-[11px] text-slate-400">Action: <span className="text-slate-200">{tool}</span></p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.1] transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
