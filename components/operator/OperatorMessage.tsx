"use client";

import type { OperatorMessage as OperatorMessageType } from "@/lib/operator/types";
import { ToolResultRenderer } from "./ToolResultRenderer";
import { Bot, User, Loader2 } from "lucide-react";

interface OperatorMessageProps {
  message: OperatorMessageType;
  onNextAction?: (action: string) => void;
}

const NEXT_ACTION_LABELS: Record<string, string> = {
  getLoyaltyStats: "Loyalty stats",
  getTopFans: "Top fans",
  listRewards: "List rewards",
  createReward: "Create reward",
  runPlatformHealthCheck: "Health check",
  runB2BExpansionAgent: "Run B2B agent",
  generateDMDraft: "Generate DMs",
  generateCampaignDraft: "Draft campaign",
  simulateTokenEconomy: "Simulate token economy",
  explainTokenReadiness: "Token readiness",
  analyzeTokenEconomyRisk: "Token risks",
  getContractStatus: "Contract status",
  listFanPasses: "List passes",
  createFanPass: "Create pass",
  simulateFanPassLaunch: "Simulate launch",
  generatePartnershipPitch: "Generate pitch",
  simulateSMEPayment: "Simulate payment",
  discoverLocalBusinesses: "Discover businesses",
  scoreBusinessFit: "Score fit",
  generateRecommendations: "Recommendations",
};

function formatNextAction(action: string): string {
  return NEXT_ACTION_LABELS[action] || action.replace(/([A-Z])/g, " $1").trim();
}

export function OperatorMessage({ message, onNextAction }: OperatorMessageProps) {
  const isUser = message.role === "user";

  if (message.isLoading) {
    return (
      <div className="flex items-start gap-2 px-1">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-500/20">
          <Bot className="h-3.5 w-3.5 text-lime-400" />
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-lime-400" />
          <span className="text-xs text-slate-400">Thinking…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        isUser ? "bg-white/[0.08]" : "bg-lime-500/20"
      }`}>
        {isUser ? (
          <User className="h-3.5 w-3.5 text-slate-300" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-lime-400" />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}>
        <div className={`rounded-xl px-3 py-2 text-sm ${
          isUser
            ? "bg-white/[0.08] text-slate-200"
            : "bg-white/[0.04] text-slate-100"
        }`}>
          <p className="whitespace-pre-wrap leading-relaxed text-xs">{message.content}</p>
          {message.error && (
            <p className="mt-1 text-[11px] text-red-400">{message.error}</p>
          )}
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 px-1">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500"
              >
                {tc.toolName}
                {tc.simulated && " [sim]"}
              </span>
            ))}
          </div>
        )}

        {!isUser && message.uiBlocks && message.uiBlocks.length > 0 && (
          <div className="mt-2 w-full">
            <ToolResultRenderer blocks={message.uiBlocks} />
          </div>
        )}

        {!isUser && message.nextActions && message.nextActions.length > 0 && onNextAction && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-1">
            {message.nextActions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNextAction(action)}
                className="rounded-full border border-lime-500/20 bg-lime-500/[0.06] px-2.5 py-1 text-[10px] font-medium text-lime-400 hover:bg-lime-500/[0.12] transition"
              >
                {formatNextAction(action)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
