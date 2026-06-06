import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

function buildCommand(args) {
  return isWindows
    ? ["cmd.exe", ["/d", "/s", "/c", "npx", ...args]]
    : ["npx", args];
}

const commands = [
  buildCommand(["hardhat", "compile"]),
  buildCommand([
    "hardhat",
    "test",
    "test/AuraLoyaltyPoints.test.cjs",
    "test/AuraFanPass.test.cjs",
    "test/AuraRewardRegistry.test.cjs",
  ]),
];

const results = commands.map(([command, args]) => {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    encoding: "utf8",
  });

  return {
    command: `${command} ${args.join(" ")}`,
    status: result.status,
    durationMs: Date.now() - startedAt,
    stdout: (result.stdout || "").slice(-4000),
    stderr: (result.stderr || "").slice(-4000),
    error: result.error
      ? {
          name: result.error.name,
          message: result.error.message,
        }
      : undefined,
  };
});

console.log(JSON.stringify({
  script: "debug-contracts",
  success: results.every((result) => result.status === 0),
  results,
}, null, 2));

if (results.some((result) => result.status !== 0)) {
  process.exitCode = 1;
}
