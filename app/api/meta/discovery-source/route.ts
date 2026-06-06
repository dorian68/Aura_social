import { setMetaDiscoverySource } from "@/lib/meta/configStore";
import { logMetaInfo } from "@/lib/meta/logger";
import { handleMetaRoute, metaOk } from "@/lib/meta/routeHelpers";
import { resolveConnectionAccount } from "@/lib/meta/tokenStore";
import { MetaAppError } from "@/lib/meta/utils";
import { getDefaultWorkspaceId, recordAuditEvent } from "@/lib/workspace/store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMetaRoute("meta_discovery_source", async () => {
    const body = (await request.json().catch(() => ({}))) as { connectionId?: string; igUserId?: string };
    if (!body.connectionId || !body.igUserId) throw new MetaAppError("MISSING_DISCOVERY_SOURCE", "Choose a connected Instagram account first.", 400);
    const { connection, account } = resolveConnectionAccount(body.connectionId, body.igUserId);
    const status = setMetaDiscoverySource({
      igUserId: account.igUserId,
      token: account.pageAccessToken || account.accessToken || connection.longLivedUserToken,
      username: account.username,
    });
    logMetaInfo("meta.discovery_source_saved", { igUserId: account.igUserId, username: account.username, authProvider: account.authProvider });
    recordAuditEvent({
      workspaceId: getDefaultWorkspaceId(),
      actorType: "creator",
      action: "meta.discovery_source.saved",
      targetType: "instagram_account",
      targetId: account.igUserId,
      severity: "info",
      message: `@${account.username || account.igUserId} is now the public Business Discovery source.`,
      metadata: {
        authProvider: account.authProvider,
        tokenPersisted: false,
      },
    });
    return metaOk(status);
  });
}
