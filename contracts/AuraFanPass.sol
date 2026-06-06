// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AuraFanPass is ERC1155, Ownable {
    struct TierConfig {
        uint256 maxSupply;
        uint256 minted;
        string tierUri;
        bool active;
    }

    uint256 public constant BRONZE = 1;
    uint256 public constant SILVER = 2;
    uint256 public constant GOLD = 3;
    uint256 public constant VIP = 4;
    uint256 public constant INNER_CIRCLE = 5;

    mapping(uint256 => TierConfig) public tierConfigs;

    event FanPassMinted(address indexed to, uint256 indexed tierId, uint256 amount);
    event TierConfigured(uint256 indexed tierId, uint256 maxSupply, string tierUri, bool active);

    constructor(string memory baseUri) ERC1155(baseUri) Ownable(msg.sender) {}

    function configureTier(
        uint256 tierId,
        uint256 maxSupply,
        string calldata tierUri,
        bool active
    ) external onlyOwner {
        require(tierId >= BRONZE && tierId <= INNER_CIRCLE, "Aura: invalid tier");
        require(maxSupply >= tierConfigs[tierId].minted, "Aura: below minted supply");

        tierConfigs[tierId].maxSupply = maxSupply;
        tierConfigs[tierId].tierUri = tierUri;
        tierConfigs[tierId].active = active;

        emit TierConfigured(tierId, maxSupply, tierUri, active);
    }

    function mintPass(address to, uint256 tierId, uint256 amount) external onlyOwner {
        TierConfig storage config = tierConfigs[tierId];
        require(config.active, "Aura: tier inactive");
        require(config.minted + amount <= config.maxSupply, "Aura: tier sold out");

        config.minted += amount;
        _mint(to, tierId, amount, "");
        emit FanPassMinted(to, tierId, amount);
    }

    function ownsTier(address account, uint256 tierId) external view returns (bool) {
        return balanceOf(account, tierId) > 0;
    }

    function uri(uint256 tierId) public view override returns (string memory) {
        string memory tierUri = tierConfigs[tierId].tierUri;
        if (bytes(tierUri).length > 0) {
            return tierUri;
        }
        return super.uri(tierId);
    }
}
