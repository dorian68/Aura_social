// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AuraRewardRegistry is Ownable {
    struct Reward {
        string name;
        uint256 costInPoints;
        uint256 stock;
        uint256 claimed;
        bool active;
    }

    uint256 public rewardCount;
    mapping(uint256 => Reward) public rewards;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event RewardCreated(uint256 indexed rewardId, string name, uint256 costInPoints, uint256 stock);
    event RewardUpdated(uint256 indexed rewardId, string name, uint256 costInPoints, uint256 stock, bool active);
    event RewardClaimed(uint256 indexed rewardId, address indexed fan, uint256 fanPoints);

    constructor() Ownable(msg.sender) {}

    function createReward(
        string calldata name,
        uint256 costInPoints,
        uint256 stock,
        bool active
    ) external onlyOwner returns (uint256 rewardId) {
        rewardId = ++rewardCount;
        rewards[rewardId] = Reward({
            name: name,
            costInPoints: costInPoints,
            stock: stock,
            claimed: 0,
            active: active
        });

        emit RewardCreated(rewardId, name, costInPoints, stock);
    }

    function updateReward(
        uint256 rewardId,
        string calldata name,
        uint256 costInPoints,
        uint256 stock,
        bool active
    ) external onlyOwner {
        require(rewardId > 0 && rewardId <= rewardCount, "Aura: reward missing");
        Reward storage reward = rewards[rewardId];
        require(stock >= reward.claimed, "Aura: stock below claimed");

        reward.name = name;
        reward.costInPoints = costInPoints;
        reward.stock = stock;
        reward.active = active;

        emit RewardUpdated(rewardId, name, costInPoints, stock, active);
    }

    function claimReward(uint256 rewardId, uint256 fanPoints) external {
        Reward storage reward = rewards[rewardId];
        require(rewardId > 0 && rewardId <= rewardCount, "Aura: reward missing");
        require(reward.active, "Aura: reward inactive");
        require(!hasClaimed[rewardId][msg.sender], "Aura: already claimed");
        require(fanPoints >= reward.costInPoints, "Aura: insufficient points");
        require(reward.stock == 0 || reward.claimed < reward.stock, "Aura: out of stock");

        hasClaimed[rewardId][msg.sender] = true;
        reward.claimed += 1;

        emit RewardClaimed(rewardId, msg.sender, fanPoints);
    }

    function checkEligibility(
        uint256 rewardId,
        address fan,
        uint256 fanPoints
    ) external view returns (bool eligible, string memory reason) {
        if (rewardId == 0 || rewardId > rewardCount) return (false, "Reward missing");

        Reward memory reward = rewards[rewardId];
        if (!reward.active) return (false, "Reward inactive");
        if (hasClaimed[rewardId][fan]) return (false, "Already claimed");
        if (fanPoints < reward.costInPoints) return (false, "Insufficient points");
        if (reward.stock != 0 && reward.claimed >= reward.stock) return (false, "Out of stock");

        return (true, "Eligible");
    }
}
