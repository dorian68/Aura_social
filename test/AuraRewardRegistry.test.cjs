const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuraRewardRegistry", function () {
  it("creates and claims a reward when fan points are eligible", async function () {
    const [, fan] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AuraRewardRegistry");
    const registry = await Contract.deploy();

    await registry.createReward("VIP live access", 750, 10, true);
    const [eligible] = await registry.checkEligibility(1, fan.address, 900);
    expect(eligible).to.equal(true);

    await registry.connect(fan).claimReward(1, 900);
    const reward = await registry.rewards(1);
    expect(reward.claimed).to.equal(1);
    expect(await registry.hasClaimed(1, fan.address)).to.equal(true);
  });

  it("blocks claims with insufficient points", async function () {
    const [, fan] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AuraRewardRegistry");
    const registry = await Contract.deploy();

    await registry.createReward("VIP live access", 750, 10, true);
    const [eligible, reason] = await registry.checkEligibility(1, fan.address, 500);
    expect(eligible).to.equal(false);
    expect(reason).to.equal("Insufficient points");

    await expect(registry.connect(fan).claimReward(1, 500)).to.be.revertedWith(
      "Aura: insufficient points",
    );
  });
});
