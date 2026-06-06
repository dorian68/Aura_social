import { ok } from "@/lib/apiResponse";
import { buildWorkspaceSnapshot } from "@/lib/workspace/status";

export const runtime = "nodejs";

export async function GET() {
  return ok(buildWorkspaceSnapshot());
}
