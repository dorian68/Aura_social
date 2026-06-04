import {
  getContractStatus,
  loadAbi,
  mockMintFanPass,
  mockMintPoints,
} from "@/lib/blockchain/blockchainService";
import { registerTool } from "../toolRegistry";
import type { ToolResult } from "../types";

registerTool({
  name: "getContractStatus",
  description: "Returns the current smart contract deployment and ABI status.",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Contract status", uiBlock: "health_status" },
  auditAction: "operator.contracts.getStatus",
  async execute(_input, _context): Promise<ToolResult> {
    const status = getContractStatus();
    const abis = {
      AuraLoyaltyPoints: loadAbi("AuraLoyaltyPoints").length,
      AuraFanPass: loadAbi("AuraFanPass").length,
      AuraRewardRegistry: loadAbi("AuraRewardRegistry").length,
    };
    const abiReady = Object.values(abis).every((c) => c > 0);

    return {
      success: true,
      simulated: false,
      data: { status, abis, abiReady },
      uiBlocks: [
        {
          type: "health_status",
          title: "Smart Contract Status",
          data: {
            mode: status.mode,
            liveChain: status.liveChain,
            mainnet: status.mainnet,
            transferabilityDefault: status.transferabilityDefault,
            abiReady,
            abis,
            status: abiReady ? "ready" : "degraded",
          },
        },
      ],
      nextActions: ["runContractDiagnostics", "explainContractArchitecture", "simulateMintPoints"],
    };
  },
});

registerTool({
  name: "runContractDiagnostics",
  description: "Runs diagnostics on the smart contract ABIs and configuration.",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Contract diagnostics report", uiBlock: "health_status" },
  auditAction: "operator.contracts.diagnostics",
  async execute(_input, _context): Promise<ToolResult> {
    const contracts = ["AuraLoyaltyPoints", "AuraFanPass", "AuraRewardRegistry"];
    const results = contracts.map((name) => {
      const abi = loadAbi(name);
      return {
        name,
        abiLoaded: abi.length > 0,
        functionCount: abi.filter((e: { type: string }) => e.type === "function").length,
        eventCount: abi.filter((e: { type: string }) => e.type === "event").length,
        status: abi.length > 0 ? "ready" : "missing",
      };
    });

    return {
      success: true,
      simulated: false,
      data: { contracts: results },
      uiBlocks: [
        {
          type: "health_status",
          title: "Contract Diagnostics",
          data: {
            contracts: results,
            allReady: results.every((r) => r.abiLoaded),
            summary: results
              .map((r) => `${r.name}: ${r.status} (${r.functionCount} fns, ${r.eventCount} events)`)
              .join("; "),
          },
        },
      ],
      nextActions: ["getContractStatus", "explainContractArchitecture"],
    };
  },
});

registerTool({
  name: "explainContractArchitecture",
  description: "Explains the Aura smart contract architecture (AuraLoyaltyPoints, AuraFanPass, AuraRewardRegistry).",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { description: "Contract architecture explanation", uiBlock: "tool_result" },
  auditAction: "operator.contracts.explain",
  async execute(_input, _context): Promise<ToolResult> {
    const explanation = {
      overview:
        "Aura uses three ERC-compatible smart contracts for its loyalty and fan pass infrastructure.",
      contracts: [
        {
          name: "AuraLoyaltyPoints",
          purpose: "Non-transferable ERC-20 style points token. Minted when fans earn points, burned on redemption.",
          chain: "Polygon / local testnet",
          transferable: false,
        },
        {
          name: "AuraFanPass",
          purpose: "ERC-721 style NFT fan passes. Each tier is a separate token class. Non-transferable by default.",
          chain: "Polygon / local testnet",
          transferable: false,
        },
        {
          name: "AuraRewardRegistry",
          purpose: "On-chain registry of reward redemptions. Links fan addresses to redeemed reward IDs.",
          chain: "Polygon / local testnet",
          transferable: false,
        },
      ],
      currentMode: "Local proof of concept. No mainnet deployment. All contract interactions are simulated.",
      readiness: "ABIs compiled. Hardhat test suite available. Testnet deployment: pending.",
    };

    return {
      success: true,
      simulated: false,
      data: { explanation },
      uiBlocks: [
        {
          type: "tool_result",
          title: "Contract Architecture",
          data: {
            overview: explanation.overview,
            currentMode: explanation.currentMode,
            readiness: explanation.readiness,
            contracts: explanation.contracts,
          },
        },
      ],
      nextActions: ["runContractDiagnostics", "simulateMintPoints", "simulateMintFanPass"],
    };
  },
});

registerTool({
  name: "simulateMintPoints",
  description: "Simulates minting loyalty points to a fan wallet address (mock only).",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      fanAddress: { type: "string", description: "Fan wallet address (mock: 0x...)", default: "0xMockFan001" },
      amount: { type: "number", description: "Points to mint", default: 1000 },
    },
  },
  outputSchema: { description: "Mock mint transaction result", uiBlock: "tool_result" },
  auditAction: "operator.contracts.simulateMintPoints",
  async execute(input: { fanAddress?: string; amount?: number }, _context): Promise<ToolResult> {
    const fanAddress = input.fanAddress || "0xMockFan001";
    const amount = input.amount || 1000;
    const action = mockMintPoints(fanAddress, amount);

    return {
      success: true,
      simulated: true,
      data: { action },
      uiBlocks: [
        {
          type: "tool_result",
          title: "[SIMULATION] Mint Loyalty Points",
          data: {
            action: action.action,
            txMode: action.txMode,
            referenceId: action.referenceId,
            message: action.message,
            simulated: true,
            amount,
            fanAddress: `${fanAddress.slice(0, 6)}...${fanAddress.slice(-4)}`,
          },
        },
      ],
      nextActions: ["simulateMintFanPass", "getContractStatus"],
    };
  },
});

registerTool({
  name: "simulateMintFanPass",
  description: "Simulates minting a fan pass NFT to a fan wallet address (mock only).",
  category: "contracts",
  riskLevel: "safe",
  inputSchema: {
    type: "object",
    properties: {
      fanAddress: { type: "string", description: "Fan wallet address", default: "0xMockFan001" },
      tier: {
        type: "string",
        description: "Pass tier",
        enum: ["bronze", "silver", "gold", "vip", "inner_circle", "event"],
        default: "gold",
      },
    },
  },
  outputSchema: { description: "Mock mint fan pass result", uiBlock: "tool_result" },
  auditAction: "operator.contracts.simulateMintFanPass",
  async execute(input: { fanAddress?: string; tier?: string }, _context): Promise<ToolResult> {
    const fanAddress = input.fanAddress || "0xMockFan001";
    const tier = input.tier || "gold";
    const action = mockMintFanPass(fanAddress, tier);

    return {
      success: true,
      simulated: true,
      data: { action },
      uiBlocks: [
        {
          type: "tool_result",
          title: "[SIMULATION] Mint Fan Pass",
          data: {
            action: action.action,
            txMode: action.txMode,
            referenceId: action.referenceId,
            message: action.message,
            simulated: true,
            tier,
            fanAddress: `${fanAddress.slice(0, 6)}...${fanAddress.slice(-4)}`,
          },
        },
      ],
      nextActions: ["simulateMintPoints", "getContractStatus", "listFanPasses"],
    };
  },
});
