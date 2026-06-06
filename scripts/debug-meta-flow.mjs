import { diagnoseAccessToken, diagnoseMetaConfiguration } from "../lib/meta/diagnostics.ts";
import { getMetaLogFilePath, logMetaInfo } from "../lib/meta/logger.ts";

const args = parseArgs(process.argv.slice(2));
const provider = args.provider || process.env.META_DEBUG_PROVIDER || "instagram";
const accessToken = args.accessToken || process.env.META_DEBUG_ACCESS_TOKEN || "";
const igUserId = args.igUserId || process.env.META_DEBUG_IG_USER_ID || "me";

const steps = [];

function step(id, label, status, output = {}) {
  const entry = { id, label, status, output };
  steps.push(entry);
  console.log(`[STEP ${id}] ${label}`);
  console.log(`[STATUS] ${status}`);
  console.log(`[OUTPUT] ${JSON.stringify(output)}`);
}

const configDiagnostic = diagnoseMetaConfiguration();
step(1, "Check Meta runtime configuration", configDiagnostic.success ? "success" : "fail", {
  mode: configDiagnostic.mode,
  mockMeta: configDiagnostic.mockMeta,
  graphApiVersion: configDiagnostic.graphApiVersion,
  missing: configDiagnostic.missing,
  setup: configDiagnostic.setup,
});

if (!accessToken) {
  step(2, "Check debug access token", "skipped", {
    tokenPresent: false,
    next: "Provide META_DEBUG_ACCESS_TOKEN or run OAuth from the dashboard for browser authentication.",
  });
  finish(configDiagnostic.success);
} else {
  step(2, "Check debug access token", "success", {
    tokenPresent: true,
    tokenPreview: summarizeToken(accessToken),
    provider,
    igUserId,
  });

  const diagnostic = await diagnoseAccessToken({
    accessToken,
    provider: provider === "facebook" ? "facebook" : "instagram",
    igUserId,
  });

  step(3, "Run provider token diagnostic", diagnostic.success ? "success" : "fail", diagnostic);
  finish(Boolean(configDiagnostic.success && diagnostic.success));
}

function finish(success) {
  logMetaInfo("debug.meta_flow.completed", {
    success,
    provider,
    tokenProvided: Boolean(accessToken),
    stepCount: steps.length,
  });
  console.log(
    JSON.stringify(
      {
        script: "debug-meta-flow",
        success,
        logFile: getMetaLogFilePath(),
        steps,
      },
      null,
      2,
    ),
  );
  if (!success) process.exitCode = 1;
}

function parseArgs(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--provider" && next) output.provider = next;
    if (arg === "--access-token" && next) output.accessToken = next;
    if (arg === "--ig-user-id" && next) output.igUserId = next;
  }
  return output;
}

function summarizeToken(token) {
  return {
    length: token.length,
    first4: token.slice(0, 4),
    last4: token.slice(-4),
  };
}
