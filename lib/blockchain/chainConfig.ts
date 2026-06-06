import type { SupportedChain } from "./types";

export const supportedChains: SupportedChain[] = [
  {
    id: 31337,
    name: "Hardhat Local",
    environment: "local",
    rpcUrl: "http://127.0.0.1:8545",
    enabled: true,
  },
  {
    id: 11155111,
    name: "Sepolia",
    environment: "testnet",
    enabled: false,
  },
  {
    id: 1,
    name: "Ethereum Mainnet",
    environment: "mainnet",
    enabled: false,
  },
];

export function getSupportedChains() {
  return supportedChains;
}
