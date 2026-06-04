"use client";

import { useState, useCallback } from "react";
import type { OperatorMessage } from "@/lib/operator/types";
import { OperatorLauncher } from "./OperatorLauncher";
import { OperatorChatWindow } from "./OperatorChatWindow";

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEMO_CONTEXT = {
  workspaceId: "workspace_aura_demo",
  currentPage: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
  selectedCreatorId: "creator-demo",
};

export function AuraOperator() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<OperatorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: OperatorMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const loadingMessage: OperatorMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/operator/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          context: {
            ...DEMO_CONTEXT,
            currentPage: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
          },
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = await response.json() as {
        success: boolean;
        data?: {
          reply: string;
          toolCalls: OperatorMessage["toolCalls"];
          uiBlocks: OperatorMessage["uiBlocks"];
          nextActions: string[];
        };
        error?: { message: string };
      };

      const assistantMessage: OperatorMessage = {
        id: generateId(),
        role: "assistant",
        content: json.success && json.data ? json.data.reply : (json.error?.message || "An error occurred."),
        toolCalls: json.data?.toolCalls || [],
        uiBlocks: json.data?.uiBlocks || [],
        nextActions: json.data?.nextActions || [],
        timestamp: new Date().toISOString(),
        error: !json.success ? (json.error?.message || "Unknown error") : undefined,
      };

      setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
    } catch (err) {
      const errorMessage: OperatorMessage = {
        id: generateId(),
        role: "assistant",
        content: "Connection error. Is the server running?",
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Network error",
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  function handleClear() {
    setMessages([]);
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Desktop: fixed bottom-right floating panel */}
      <div className="fixed bottom-5 right-5 z-50 hidden flex-col items-end gap-3 sm:flex">
        {isOpen && (
          <div className="
            w-[360px] overflow-hidden rounded-lg border border-white/[0.08]
            bg-[#0a0a0f]/95 shadow-[0_20px_60px_rgba(0,0,0,0.8)]
            backdrop-blur-xl
            max-h-[600px] flex flex-col
            sm:w-[360px]
            animate-in slide-in-from-bottom-2 duration-200
          ">
            <OperatorChatWindow
              messages={messages}
              onSend={sendMessage}
              onClose={() => setIsOpen(false)}
              onClear={handleClear}
              isLoading={isLoading}
            />
          </div>
        )}
        <OperatorLauncher
          onClick={() => setIsOpen((o) => !o)}
          hasMessages={hasMessages}
        />
      </div>

      {!isOpen ? (
        <div className="fixed bottom-4 right-4 z-50 sm:hidden">
          <OperatorLauncher
            onClick={() => setIsOpen(true)}
            hasMessages={hasMessages}
          />
        </div>
      ) : null}

      {/* Mobile: full-screen overlay when open */}
      {isOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-lg border-t border-white/[0.08] bg-[#0a0a0f]">
            <OperatorChatWindow
              messages={messages}
              onSend={sendMessage}
              onClose={() => setIsOpen(false)}
              onClear={handleClear}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
}
