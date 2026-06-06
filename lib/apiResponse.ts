import { NextResponse } from "next/server";

export function ok<T>(data: T, meta: Record<string, unknown> = {}) {
  return NextResponse.json({
    success: true,
    data,
    meta,
  });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details: string | Record<string, unknown> = "",
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function handleApiError(error: unknown, fallbackCode = "AURA_API_ERROR") {
  // Log the real error server-side; return a generic message so internal
  // exception strings / stack-adjacent details are not leaked to clients.
  console.error(`[${fallbackCode}]`, error instanceof Error ? error.stack || error.message : error);
  return fail(fallbackCode, "The request could not be processed.", 500);
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}
