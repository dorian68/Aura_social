// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AuraLoyaltyPoints is ERC20, Ownable {
    bool public transfersEnabled;

    event PointsMinted(address indexed to, uint256 amount, string referenceId);
    event PointsRedeemed(address indexed from, uint256 amount, string referenceId);
    event TransferabilityChanged(bool enabled);

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function mintPoints(address to, uint256 amount, string calldata referenceId) external onlyOwner {
        _mint(to, amount);
        emit PointsMinted(to, amount, referenceId);
    }

    function redeemPoints(address from, uint256 amount, string calldata referenceId) external onlyOwner {
        _burn(from, amount);
        emit PointsRedeemed(from, amount, referenceId);
    }

    function setTransfersEnabled(bool enabled) external onlyOwner {
        transfersEnabled = enabled;
        emit TransferabilityChanged(enabled);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        require(transfersEnabled, "Aura: transfers disabled");
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(transfersEnabled, "Aura: transfers disabled");
        return super.transferFrom(from, to, amount);
    }
}
