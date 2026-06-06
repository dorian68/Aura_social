import { updateMetaRuntimeConfig } from "@/lib/meta/configStore";
import { logMetaInfo } from "@/lib/meta/logger";
import { handleMetaRoute, metaOk } from "@/lib/meta/routeHelpers";
import { getDefaultWorkspaceId, recordAuditEvent } from "@/lib/workspace/store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMetaRoute("meta_runtime_config", async () => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = updateMetaRuntimeConfig(body);
    logMetaInfo("meta.runtime_config_saved", {
      hasAppId: Boolean(body.appId),
      hasAppSecret: Boolean(body.appSecret),
      graphApiVersion: body.graphApiVersion,
      authMode: body.authMode,
      hasFacebookConfigId: Boolean(body.facebookLoginConfigId),
      frontendUrl: body.frontendUrl,
      mockMeta: body.mockMeta,
    });
    recordAuditEvent({
      workspaceId: getDefaultWorkspaceId(),
      actorType: "developer",
      action: "meta.runtime_config.saved",
      targetType: "integration",
      targetId: "meta_login",
      severity: "info",
      message: "Meta runtime configuration was updated from the local dashboard/API.",
      metadata: {
        hasAppId: Boolean(body.appId),
        hasAppSecret: Boolean(body.appSecret),
        authMode: typeof body.authMode === "string" ? body.authMode : null,
        mockMeta: Boolean(body.mockMeta),
      },
    });
    return metaOk(status);
  });
}
