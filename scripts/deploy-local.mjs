import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  const Points = await ethers.getContractFactory("AuraLoyaltyPoints");
  const points = await Points.deploy("Aura Points", "AURA");
  await points.waitForDeployment();

  const FanPass = await ethers.getContractFactory("AuraFanPass");
  const fanPass = await FanPass.deploy("ipfs://aura/{id}.json");
  await fanPass.waitForDeployment();

  const Rewards = await ethers.getContractFactory("AuraRewardRegistry");
  const rewards = await Rewards.deploy();
  await rewards.waitForDeployment();

  const output = {
    network: hre.network.name,
    deployer: maskAddress(deployer.address),
    contracts: {
      auraLoyaltyPoints: await points.getAddress(),
      auraFanPass: await fanPass.getAddress(),
      auraRewardRegistry: await rewards.getAddress(),
    },
    mode: "Local/testnet proof of concept. Mainnet deployment is disabled by default.",
  };

  console.log(JSON.stringify(output, null, 2));
}

function maskAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
