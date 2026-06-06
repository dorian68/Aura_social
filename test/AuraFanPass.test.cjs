const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuraFanPass", function () {
  it("configures a tier, mints a pass, and checks access", async function () {
    const [, fan] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AuraFanPass");
    const pass = await Contract.deploy("ipfs://aura/{id}.json");
    const vipTier = await pass.VIP();

    await pass.configureTier(vipTier, 25, "ipfs://aura/vip.json", true);
    await pass.mintPass(fan.address, vipTier, 1);

    expect(await pass.balanceOf(fan.address, vipTier)).to.equal(1);
    expect(await pass.ownsTier(fan.address, vipTier)).to.equal(true);
    expect(await pass.uri(vipTier)).to.equal("ipfs://aura/vip.json");
  });

  it("prevents minting beyond configured supply", async function () {
    const [, fan] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AuraFanPass");
    const pass = await Contract.deploy("ipfs://aura/{id}.json");
    const bronzeTier = await pass.BRONZE();

    await pass.configureTier(bronzeTier, 1, "ipfs://aura/bronze.json", true);
    await pass.mintPass(fan.address, bronzeTier, 1);

    await expect(pass.mintPass(fan.address, bronzeTier, 1)).to.be.revertedWith(
      "Aura: tier sold out",
    );
  });
});
