# Aura Blockchain Proof of Concept

This folder prepares Aura for optional local/testnet smart contract integration.

## Current Mode

- Smart contract mode: local/testnet proof of concept.
- Live chain: not connected.
- Mainnet: disabled.
- Transfers: disabled by default in `AuraLoyaltyPoints`.
- Wallet integration: not implemented yet.

## Contracts

- `AuraLoyaltyPoints.sol`: owner-controlled mint/redeem points, public transfers disabled by default.
- `AuraFanPass.sol`: ERC1155 fan pass tiers.
- `AuraRewardRegistry.sol`: reward creation and claim eligibility proof of concept.

## Commands

```bash
npm run debug:contracts
npm run contracts:compile
npm run contracts:test
npm run contracts:export-abis
```

## ABI Files

Exported ABI files live in `lib/blockchain/abi`.

## Product Mapping

The app remains off-chain first:

```text
loyalty ledger -> reward unlocks -> fan passes -> optional contract representation
```

The contracts should not be presented as an investment product. They are infrastructure for points,
access, rewards and auditable local/testnet demos.
