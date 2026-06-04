"use client";

import { useRef, useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import type { OperatorMessage as OperatorMessageType } from "@/lib/operator/types";
import { OperatorMessage } from "./OperatorMessage";
import { OperatorInput } from "./OperatorInput";

interface OperatorChatWindowProps {
  messages: OperatorMessageType[];
  onSend: (message: string) => void;
  onClose: () => void;
  onClear: () => void;
  isLoading: boolean;
}

const STARTER_PROMPTS = [
  "Check workspace health",
  "Show loyalty stats",
  "Run B2B agent",
  "Explain Token Readiness",
];

export function OperatorChatWindow({
  messages,
  onSend,
  onClose,
  onClear,
  isLoading,
}: OperatorChatWindowProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onSend(trimmed);
  }

  function handleNextAction(action: string) {
    if (isLoading) return;
    onSend(action);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.6)]" />
          <span className="text-xs font-semibold text-white">Aura Operator</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            title="Clear conversation"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-4 text-center">
            <div className="rounded-full bg-lime-500/10 p-3">
              <div className="h-6 w-6 rounded-full bg-lime-500/20 flex items-center justify-center">
                <span className="text-lime-400 text-xs font-bold">A</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 mb-1">Aura Operator</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your natural-language control layer. Ask me to run tools, check health, generate content, or navigate the platform.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSend(p)}
                  className="rounded-full border border-lime-500/20 bg-lime-500/[0.06] px-2.5 py-1 text-[10px] font-medium text-lime-400 hover:bg-lime-500/[0.12] transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <OperatorMessage
              key={msg.id}
              message={msg}
              onNextAction={handleNextAction}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
        <OperatorInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isLoading}
        />
        <p className="mt-1.5 text-center text-[9px] text-slate-600">
          Enter to send · Shift+Enter for newline · Rules mode
        </p>
      </div>
    </div>
  );
}
