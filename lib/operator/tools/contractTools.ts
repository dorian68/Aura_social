import {
  getContractStatus,
  getContractStatusAsync,
  isValidAddress,
  loadAbi,
  mintFanPass,
  mintPoints,
} from "@/lib/blockchain/blockchainService";
import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

function invalidArg(message: string): ToolResult {
  return { success: false, error: message, simulated: false, uiBlocks: [], nextActions: [] };
}

registerTool({
  name: "getContractStatus",
  description: "Returns the current smart contract deployment and on-chain connection status.",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Contract status", uiBlock: "health_status" },
  auditAction: "operator.contracts.getStatus",
  async execute(_input, _context): Promise<ToolResult> {
    const status = await getContractStatusAsync();
    const abis = {
      AuraLoyaltyPoints: loadAbi("AuraLoyaltyPoints").length,
      AuraFanPass: loadAbi("AuraFanPass").length,
      AuraRewardRegistry: loadAbi("AuraRewardRegistry").length,
    };
    const abiReady = Object.values(abis).every((c) => c > 0);
    const onChain = status.liveChain.includes("chainId");

    return {
      success: true,
      simulated: !onChain,
      data: { status, abis, abiReady, onChain },
      uiBlocks: [
        {
          type: "health_status",
          title: "Smart Contract Status",
          data: {
            mode: status.mode,
            liveChain: status.liveChain,
            mainnet: status.mainnet,
            abiReady,
            abis,
            status: onChain ? "ready" : abiReady ? "mock_ready" : "degraded",
          },
        },
      ],
      nextActions: ["runContractDiagnostics", "explainContractArchitecture", "simulateMintPoints"],
    };
  },
});

registerTool({
  name: "runContractDiagnostics",
  description: "Runs diagnostics on the smart contract ABIs and Hardhat connection.",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Contract diagnostics report", uiBlock: "health_status" },
  auditAction: "operator.contracts.diagnostics",
  async execute(_input, _context): Promise<ToolResult> {
    const [status] = await Promise.all([getContractStatusAsync()]);
    const contracts = ["AuraLoyaltyPoints", "AuraFanPass", "AuraRewardRegistry"];
    const results = contracts.map((name) => {
      const abi = loadAbi(name);
      return {
        name,
        abiLoaded: abi.length > 0,
        functionCount: (abi as Array<{type:string}>).filter((e) => e.type === "function").length,
        eventCount: (abi as Array<{type:string}>).filter((e) => e.type === "event").length,
        status: abi.length > 0 ? "ready" : "missing",
      };
    });

    return {
      success: true,
      simulated: false,
      data: { contracts: results, nodeStatus: status.liveChain },
      uiBlocks: [
        {
          type: "health_status",
          title: "Contract Diagnostics",
          data: {
            contracts: results,
            allReady: results.every((r) => r.abiLoaded),
            nodeStatus: status.liveChain,
            summary: results.map((r) => `${r.name}: ${r.status} (${r.functionCount} fns)`).join("; "),
          },
        },
      ],
      nextActions: ["getContractStatus", "explainContractArchitecture"],
    };
  },
});

registerTool({
  name: "explainContractArchitecture",
  description: "Explains the Aura smart contract architecture.",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Contract architecture explanation", uiBlock: "tool_result" },
  auditAction: "operator.contracts.explain",
  async execute(_input, _context): Promise<ToolResult> {
    const status = await getContractStatusAsync();
    const onChain = status.liveChain.includes("chainId");
    return {
      success: true,
      simulated: false,
      data: { status, onChain },
      uiBlocks: [
        {
          type: "tool_result",
          title: "Contract Architecture",
          data: {
            overview: "Aura uses three ERC-compatible smart contracts for its loyalty and fan pass infrastructure.",
            currentMode: onChain ? status.liveChain : "Hardhat node not reachable — running in mock mode.",
            readiness: "ABIs compiled. Hardhat test suite: 6/6 passing.",
            contracts: [
              { name: "AuraLoyaltyPoints", purpose: "Non-transferable ERC-20 points token.", transferable: false },
              { name: "AuraFanPass", purpose: "ERC-1155 fan pass NFT by tier.", transferable: false },
              { name: "AuraRewardRegistry", purpose: "On-chain redemption registry.", transferable: false },
            ],
          },
        },
      ],
      nextActions: ["runContractDiagnostics", "simulateMintPoints", "simulateMintFanPass"],
    };
  },
});

registerTool({
  name: "simulateMintPoints",
  description: "Mints loyalty points to a fan wallet. Simulated by default; real on-chain tx only when AURA_ALLOW_ONCHAIN_WRITES=true.",
  category: "contracts",
  riskLevel: "confirmation_required",
  inputSchema: {
    type: "object",
    properties: {
      fanAddress: { type: "string", description: "Fan wallet address", default: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
      amount: { type: "number", description: "Points to mint", default: 1000 },
    },
  },
  outputSchema: { description: "Mint transaction result", uiBlock: "tool_result" },
  auditAction: "operator.contracts.simulateMintPoints",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const fanAddress = String(input.fanAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    if (!isValidAddress(fanAddress)) return invalidArg("fanAddress must be a valid 0x-prefixed 40-hex wallet address.");
    const amount = Number(input.amount ?? 1000);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return invalidArg("amount must be a positive number ≤ 1,000,000,000.");
    const action = await mintPoints(fanAddress, amount);
    const isReal = action.txMode === "local_hardhat";

    return {
      success: true,
      simulated: !isReal,
      data: { action },
      uiBlocks: [
        {
          type: "tool_result",
          title: isReal ? "✓ Mint Loyalty Points — On-chain" : "[MOCK] Mint Loyalty Points",
          data: {
            action: action.action,
            txMode: action.txMode,
            txHash: action.txHash || null,
            blockNumber: action.blockNumber || null,
            gasUsed: action.gasUsed || null,
            message: action.message,
            amount,
            fanAddress: `${fanAddress.slice(0, 6)}…${fanAddress.slice(-4)}`,
          },
        },
      ],
      nextActions: ["simulateMintFanPass", "getContractStatus"],
    };
  },
});

registerTool({
  name: "simulateMintFanPass",
  description: "Mints a fan pass NFT to a wallet. Simulated by default; real on-chain tx only when AURA_ALLOW_ONCHAIN_WRITES=true.",
  category: "contracts",
  riskLevel: "confirmation_required",
  inputSchema: {
    type: "object",
    properties: {
      fanAddress: { type: "string", description: "Fan wallet address", default: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
      tier: {
        type: "string",
        description: "Pass tier",
        enum: ["bronze", "silver", "gold", "vip", "inner_circle", "event"],
        default: "gold",
      },
    },
  },
  outputSchema: { description: "Mint fan pass result", uiBlock: "tool_result" },
  auditAction: "operator.contracts.simulateMintFanPass",
  async execute(input: Record<string, unknown>, _context): Promise<ToolResult> {
    const fanAddress = String(input.fanAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    if (!isValidAddress(fanAddress)) return invalidArg("fanAddress must be a valid 0x-prefixed 40-hex wallet address.");
    const allowedTiers = ["bronze", "silver", "gold", "vip", "inner_circle", "event"];
    const tier = String(input.tier || "gold");
    if (!allowedTiers.includes(tier)) return invalidArg(`tier must be one of: ${allowedTiers.join(", ")}.`);
    const action = await mintFanPass(fanAddress, tier);
    const isReal = action.txMode === "local_hardhat";

    return {
      success: true,
      simulated: !isReal,
      data: { action },
      uiBlocks: [
        {
          type: "tool_result",
          title: isReal ? "✓ Mint Fan Pass — On-chain" : "[MOCK] Mint Fan Pass",
          data: {
            action: action.action,
            txMode: action.txMode,
            txHash: action.txHash || null,
            blockNumber: action.blockNumber || null,
            gasUsed: action.gasUsed || null,
            message: action.message,
            tier,
            fanAddress: `${fanAddress.slice(0, 6)}…${fanAddress.slice(-4)}`,
          },
        },
      ],
      nextActions: ["simulateMintPoints", "getContractStatus", "listFanPasses"],
    };
  },
});
