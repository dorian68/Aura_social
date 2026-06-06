const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuraLoyaltyPoints", function () {
  it("mints and redeems points through the owner", async function () {
    const [, fan] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AuraLoyaltyPoints");
    const points = await Contract.deploy("Aura Points", "AURA");

    await points.mintPoints(fan.address, 500, "debug-award");
    expect(await points.balanceOf(fan.address)).to.equal(500);

    await points.redeemPoints(fan.address, 125, "debug-redeem");
    expect(await points.balanceOf(fan.address)).to.equal(375);
  });

  it("keeps public transfers disabled by default and allows explicit enablement", async function () {
    const [, fan, otherFan] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AuraLoyaltyPoints");
    const points = await Contract.deploy("Aura Points", "AURA");

    await points.mintPoints(fan.address, 100, "debug-award");
    await expect(points.connect(fan).transfer(otherFan.address, 10)).to.be.revertedWith(
      "Aura: transfers disabled",
    );

    await points.setTransfersEnabled(true);
    await points.connect(fan).transfer(otherFan.address, 10);
    expect(await points.balanceOf(otherFan.address)).to.equal(10);
  });
});
