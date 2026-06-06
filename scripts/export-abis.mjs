import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contracts = ["AuraLoyaltyPoints", "AuraFanPass", "AuraRewardRegistry"];
const outputDir = path.join(root, "lib", "blockchain", "abi");

fs.mkdirSync(outputDir, { recursive: true });

const exported = [];
for (const contractName of contracts) {
  const artifactPath = path.join(root, "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const outputPath = path.join(outputDir, `${contractName}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);
  exported.push(path.relative(root, outputPath));
}

console.log(JSON.stringify({ success: true, exported }, null, 2));
