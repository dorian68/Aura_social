/* eslint-disable */
const { ethers } = require('ethers');
const fs = require('fs');

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
const abi = JSON.parse(fs.readFileSync('lib/blockchain/abi/AuraFanPass.json', 'utf8'));
const contract = new ethers.Contract('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', abi, signer);

async function run() {
  const goldId = await contract.GOLD();
  console.log('GOLD tierId:', goldId.toString());
  const tierConfig = await contract.tierConfigs(goldId);
  console.log('active:', tierConfig.active, 'maxSupply:', tierConfig.maxSupply.toString(), 'minted:', tierConfig.minted.toString());
  if (!tierConfig.active) {
    const tx0 = await contract.configureTier(goldId, 10000n, 'ipfs://aura/gold', true);
    await tx0.wait();
    console.log('Tier configured');
  }
  const tx = await contract.mintPass('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', goldId, 1n);
  const r = await tx.wait();
  console.log(JSON.stringify({ txHash: tx.hash, block: r.blockNumber, gas: r.gasUsed.toString(), tierId: goldId.toString() }, null, 2));
}
run().catch(e => console.error('ERROR:', e.message));
