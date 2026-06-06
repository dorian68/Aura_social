import { NextResponse } from "next/server";
import { logMetaError } from "./logger";
import { structuredMetaError } from "./utils";

export function metaOk<T>(data: T, meta: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, data, meta });
}

export function metaFail(error: unknown) {
  const structured = structuredMetaError(error);
  return NextResponse.json(structured.payload, { status: structured.status });
}

export async function handleMetaRoute<T>(operation: string, fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    logMetaError(`route.${operation}.failed`, {
      code: error instanceof Error && "code" in error ? (error as { code?: string }).code : "UNKNOWN",
      message: error instanceof Error ? error.message : String(error),
    });
    return metaFail(error);
  }
}
