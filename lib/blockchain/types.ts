export type ChainEnvironment = "local" | "testnet" | "mainnet";

export interface SupportedChain {
  id: number;
  name: string;
  environment: ChainEnvironment;
  rpcUrl?: string;
  enabled: boolean;
}

export interface AuraContractAddresses {
  auraLoyaltyPoints?: string;
  auraFanPass?: string;
  auraRewardRegistry?: string;
}

export interface ContractStatus {
  mode: "Local/testnet proof of concept";
  liveChain: "Not connected" | string;
  mainnet: "Disabled";
  transferabilityDefault: "Disabled";
  message: string;
}

export interface MockContractAction {
  success: true;
  action: string;
  txMode: "mock" | "local_hardhat" | "testnet" | "mainnet";
  referenceId: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  message: string;
}
