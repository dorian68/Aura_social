"use client";

import { useRef } from "react";
import { Send } from "lucide-react";

interface OperatorInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function OperatorInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Ask anything about your platform…",
}: OperatorInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-lime-500/30">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
        style={{ minHeight: "20px", maxHeight: "120px" }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="Send message"
      >
        <Send className="h-3 w-3" />
      </button>
    </div>
  );
}
