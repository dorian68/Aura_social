import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";
import { getSupportedChains } from "./chainConfig";
import { getContractAddresses } from "./contractConfig";
import { isCapabilityEnabled } from "@/lib/agentGuardrails";
import type { ContractStatus, MockContractAction } from "./types";

export { getSupportedChains, getContractAddresses };

// ─── Provider & signer (lazy, singleton) ────────────────────────────────────

const RPC_URL = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";

// Hardhat default account #0 private key (well-known, testnet only)
const DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _connected: boolean | null = null;

const HARDHAT_CHAIN_ID = 31337;

async function getProvider(): Promise<ethers.JsonRpcProvider | null> {
  if (_connected === false) return null;
  if (_provider) return _provider;
  try {
    // staticNetwork = skip ethers' network auto-detection, which otherwise
    // retries ~10× over ~10s when the Hardhat node is down (the normal proto
    // state) and stalls the first contract call. Here we probe once and fall
    // back to mock fast.
    const p = new ethers.JsonRpcProvider(RPC_URL, HARDHAT_CHAIN_ID, { staticNetwork: true });
    await p.getBlockNumber();
    _provider = p;
    _connected = true;
    return p;
  } catch {
    _connected = false;
    return null;
  }
}

/** Returns the JsonRpc signer (account #0) — Hardhat manages the nonce automatically. */
async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  const provider = await getProvider();
  if (!provider) return null;
  try {
    return await provider.getSigner();
  } catch {
    return null;
  }
}

// ─── Contract loaders ────────────────────────────────────────────────────────

function loadAbi(contractName: string): ethers.InterfaceAbi {
  const abiPath = path.join(process.cwd(), "lib", "blockchain", "abi", `${contractName}.json`);
  if (!fs.existsSync(abiPath)) return [];
  return JSON.parse(fs.readFileSync(abiPath, "utf8")) as ethers.InterfaceAbi;
}

/**
 * Returns a write-capable contract, or null to force the mock path.
 * On-chain writes are sealed off by default: even when a Hardhat node is
 * reachable and signable, we refuse to sign unless AURA_ALLOW_ONCHAIN_WRITES=true.
 * This is the central guard that prevents any agent/tool (regardless of its risk
 * classification or a bypassed confirmation) from submitting a real transaction
 * with the deployer key. Read-only status checks do not use this path.
 */
async function getContract(name: "AuraLoyaltyPoints" | "AuraFanPass" | "AuraRewardRegistry") {
  if (!isCapabilityEnabled("onchain_writes")) return null;
  const signer = await getSigner();
  if (!signer) return null;
  const addrs = getContractAddresses(31337);
  const addrMap = {
    AuraLoyaltyPoints:  addrs.auraLoyaltyPoints,
    AuraFanPass:        addrs.auraFanPass,
    AuraRewardRegistry: addrs.auraRewardRegistry,
  };
  const address = addrMap[name];
  if (!address || !ethers.isAddress(address)) return null;
  const abi = loadAbi(name);
  if (!abi || (abi as unknown[]).length === 0) return null;
  return new ethers.Contract(address, abi, signer);
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export { loadAbi };

export function formatWalletAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidAddress(address?: string) {
  return Boolean(address && /^0x[a-fA-F0-9]{40}$/.test(address));
}

// ─── Real contract calls with mock fallback ──────────────────────────────────

export async function mintPoints(fanAddress: string, amount: number, referenceId = ""): Promise<MockContractAction> {
  const contract = await getContract("AuraLoyaltyPoints");
  if (!contract) return mockAction("mint_points", `[MOCK] Mint ${amount} pts to ${formatWalletAddress(fanAddress)}.`);

  try {
    const tx: ethers.TransactionResponse = await contract.mintPoints(fanAddress, BigInt(amount), referenceId || `op_${Date.now()}`);
    const receipt = await tx.wait();
    return {
      success: true,
      action: "mint_points",
      txMode: "local_hardhat",
      referenceId: tx.hash,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      message: `Minted ${amount} points to ${formatWalletAddress(fanAddress)} — tx ${tx.hash.slice(0, 10)}…`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mockAction("mint_points_failed", `mintPoints failed: ${msg.slice(0, 80)}`);
  }
}

export async function redeemPoints(fanAddress: string, amount: number, referenceId = ""): Promise<MockContractAction> {
  const contract = await getContract("AuraLoyaltyPoints");
  if (!contract) return mockAction("redeem_points", `[MOCK] Redeem ${amount} pts from ${formatWalletAddress(fanAddress)}.`);

  try {
    const tx: ethers.TransactionResponse = await contract.redeemPoints(fanAddress, BigInt(amount), referenceId || `redeem_${Date.now()}`);
    const receipt = await tx.wait();
    return {
      success: true,
      action: "redeem_points",
      txMode: "local_hardhat",
      referenceId: tx.hash,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      message: `Redeemed ${amount} points from ${formatWalletAddress(fanAddress)} — tx ${tx.hash.slice(0, 10)}…`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mockAction("redeem_points_failed", `redeemPoints failed: ${msg.slice(0, 80)}`);
  }
}

const FAN_PASS_TIER_IDS: Record<string, number> = {
  bronze: 1, silver: 2, gold: 3, vip: 4, inner_circle: 5, event: 6,
};

export async function mintFanPass(fanAddress: string, tier: string): Promise<MockContractAction> {
  const contract = await getContract("AuraFanPass");
  if (!contract) return mockAction("mint_fan_pass", `[MOCK] Mint ${tier} pass to ${formatWalletAddress(fanAddress)}.`);

  const tierId = FAN_PASS_TIER_IDS[tier.toLowerCase()] ?? 3;
  try {
    // Ensure tier is configured before minting (idempotent — reverts gracefully if already set)
    try {
      await (await contract.configureTier(BigInt(tierId), BigInt(10000), `ipfs://aura/${tier}`, true)).wait();
    } catch { /* already configured */ }
    const tx: ethers.TransactionResponse = await contract.mintPass(fanAddress, BigInt(tierId), BigInt(1));
    const receipt = await tx.wait();
    return {
      success: true,
      action: "mint_fan_pass",
      txMode: "local_hardhat",
      referenceId: tx.hash,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      message: `Minted ${tier} fan pass (tier ${tierId}) to ${formatWalletAddress(fanAddress)} — tx ${tx.hash.slice(0, 10)}…`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mockAction("mint_fan_pass_failed", `mintFanPass failed: ${msg.slice(0, 80)}`);
  }
}

export async function redeemReward(fanAddress: string, rewardId: string, pointsCost: number): Promise<MockContractAction> {
  const contract = await getContract("AuraRewardRegistry");
  if (!contract) return mockAction("redeem_reward", `[MOCK] Redeem reward ${rewardId} for ${formatWalletAddress(fanAddress)}.`);

  try {
    const tx: ethers.TransactionResponse = await contract.claimReward(fanAddress, rewardId, BigInt(pointsCost));
    const receipt = await tx.wait();
    return {
      success: true,
      action: "redeem_reward",
      txMode: "local_hardhat",
      referenceId: tx.hash,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      message: `Reward ${rewardId} claimed by ${formatWalletAddress(fanAddress)} — tx ${tx.hash.slice(0, 10)}…`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mockAction("redeem_reward_failed", `redeemReward failed: ${msg.slice(0, 80)}`);
  }
}

// ─── Kept for backward compat with operator tools ────────────────────────────
export async function mockMintPoints(fanAddress: string, amount: number): Promise<MockContractAction> {
  return mintPoints(fanAddress, amount);
}
export async function mockMintFanPass(fanAddress: string, tier: string): Promise<MockContractAction> {
  return mintFanPass(fanAddress, tier);
}
export async function mockRedeemReward(fanAddress: string, rewardId: string): Promise<MockContractAction> {
  return redeemReward(fanAddress, rewardId, 0);
}

// ─── Status (async + sync-cached) ───────────────────────────────────────────

let _cachedStatus: ContractStatus | null = null;

/** Sync version using last cached result — safe to call from non-async contexts. */
export function getContractStatus(): ContractStatus {
  if (_cachedStatus) return _cachedStatus;
  // Return a fast default while the async check runs in background
  const addrs = getContractAddresses(31337);
  return {
    mode: "Local/testnet proof of concept",
    liveChain: addrs.auraLoyaltyPoints ? "Hardhat local (pending check)" : "Not connected",
    mainnet: "Disabled",
    transferabilityDefault: "Disabled",
    message: "Checking Hardhat node connection…",
  };
}

/** Async version — fetches real on-chain data and updates the cache. */
export async function getContractStatusAsync(): Promise<ContractStatus> {
  const provider = await getProvider();
  if (!provider) {
    return {
      mode: "Local/testnet proof of concept",
      liveChain: "Not connected",
      mainnet: "Disabled",
      transferabilityDefault: "Disabled",
      message: `Hardhat node unreachable at ${RPC_URL}. Run: npx hardhat node`,
    };
  }

  const addrs = getContractAddresses(31337);
  const block = await provider.getBlockNumber().catch(() => 0);
  const network = await provider.getNetwork().catch(() => null);

  const result: ContractStatus = {
    mode: "Local/testnet proof of concept",
    liveChain: network ? `Hardhat local (chainId ${network.chainId})` : "Hardhat local",
    mainnet: "Disabled",
    transferabilityDefault: "Disabled",
    message: [
      `Connected to Hardhat node at ${RPC_URL} — block #${block}.`,
      `AuraLoyaltyPoints: ${addrs.auraLoyaltyPoints || "not deployed"}.`,
      `AuraFanPass: ${addrs.auraFanPass || "not deployed"}.`,
      `AuraRewardRegistry: ${addrs.auraRewardRegistry || "not deployed"}.`,
    ].join(" "),
  };
  _cachedStatus = result;
  return result;
}

function mockAction(action: string, message: string): MockContractAction {
  return { success: true, action, txMode: "mock", referenceId: `mock_${Date.now()}`, message };
}
