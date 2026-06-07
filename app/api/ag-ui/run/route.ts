import crypto from "node:crypto";
import { agUIConfig, llmAvailable } from "@/lib/ag-ui/config";
import { runApplicationAgent } from "@/lib/ag-ui/runtime";
import type { AGUIEvent, RunAgentInput } from "@/lib/ag-ui/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permissive CORS for the assistant endpoint. In production the canonical
 * frontend is served same-origin (no CORS needed); in local development the
 * static Frontend_Aura UI runs on a different port, so we reflect the origin.
 * No credentials are used (auth is header/cookie via middleware), so reflecting
 * the origin is safe.
 */
function corsHeaders(request: Request): Record<string, string> {
  // Reflect the request origin so cookies work in cross-origin dev setups.
  // Fall back to "*" for null/absent origins (file:// pages, Postman, curl).
  const raw = request.headers.get("origin");
  const origin = !raw || raw === "null" ? "*" : raw;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-aura-api-token, x-aura-workspace-id",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * AG-UI streaming endpoint (AG_UI_IMPLEMENTATION_GUIDE §7, §8, §17).
 *
 * POST a RunAgentInput, receive a Server-Sent-Events stream of AG-UI events
 * (RunStarted → tools → streamed text → UIBlocks/approval → RunFinished).
 * Errors are surfaced as a single RunError event (sanitized in production).
 */
export async function POST(request: Request) {
  let input: RunAgentInput;
  try {
    input = (await request.json()) as RunAgentInput;
  } catch {
    return badRequest("Invalid JSON body.", request);
  }
  if (!input || !Array.isArray(input.messages) || input.messages.length === 0) {
    return badRequest("messages[] is required and must be non-empty.", request);
  }

  const threadId = (typeof input.threadId === "string" && input.threadId) || `thread_${crypto.randomUUID()}`;
  const runId = (typeof input.runId === "string" && input.runId) || `run_${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const ts = () => new Date().toISOString();
  const startedAt = Date.now();
  let eventCount = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AGUIEvent) => {
        eventCount += 1;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // client disconnected; runApplicationAgent observes request.signal
        }
      };
      try {
        send({ type: "RunStarted", threadId, runId, timestamp: ts() });
        await runApplicationAgent({ ...input, threadId, runId }, send, request.signal);
        send({ type: "RunFinished", threadId, runId, outcome: { type: "success" }, timestamp: ts() });
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown error";
        send({
          type: "RunError",
          message: agUIConfig.isProduction ? "The assistant is temporarily unavailable. Please try again." : raw,
          code: "AGUI_RUN_ERROR",
          timestamp: ts(),
        });
      } finally {
        if (agUIConfig.debug) {
          send({ type: "Custom", name: "app.debug", value: { eventCount, latencyMs: Date.now() - startedAt, mode: llmAvailable() ? "openai" : "deterministic" }, timestamp: ts() });
        }
        try {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          /* noop */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...corsHeaders(request),
    },
  });
}

/** Lightweight health/info probe for the AG-UI endpoint. */
export async function GET(request: Request) {
  return new Response(
    JSON.stringify({
      ok: true,
      endpoint: "/api/ag-ui/run",
      method: "POST",
      streaming: "text/event-stream",
      provider: agUIConfig.provider,
      model: agUIConfig.model,
      mode: llmAvailable() ? "openai" : "deterministic",
      requireApproval: agUIConfig.requireApproval,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders(request) } },
  );
}

function badRequest(message: string, request?: Request) {
  return new Response(JSON.stringify({ type: "RunError", message, code: "AGUI_BAD_REQUEST" }), {
    status: 400,
    headers: { "Content-Type": "application/json", ...(request ? corsHeaders(request) : {}) },
  });
}
