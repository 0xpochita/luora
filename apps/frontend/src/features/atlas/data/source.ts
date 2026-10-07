/** Sample contract shown in the atlas (issues planted for the demo). */
export const SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";
import {IOracle} from "./IOracle.sol";
import {IStrategy} from "./IStrategy.sol";
import {IFlashReceiver} from "./IFlashReceiver.sol";

contract LuoraVault {
    address public owner;
    IERC20 public asset;
    IOracle public oracle;
    IStrategy public strategy;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    bool public paused;
    uint256 public feeBps = 50;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event OracleUpdated(address oldOracle, address newOracle);

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    constructor(IERC20 _asset, IOracle _oracle, IStrategy _strategy) {
        owner = msg.sender;
        asset = _asset;
        oracle = _oracle;
        strategy = _strategy;
    }

    receive() external payable {}

    function deposit(uint256 amount) external whenNotPaused {
        uint256 minted = _computeShares(amount);
        asset.transferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += minted;
        totalShares += minted;
        emit Deposit(msg.sender, amount, minted);
    }

    function withdraw(uint256 shareAmount) external whenNotPaused {
        require(shares[msg.sender] >= shareAmount, "!shares");
        uint256 value = shareAmount * _price() / 1e18;
        (bool ok, ) = msg.sender.call{value: value}("");
        require(ok, "send failed");
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        emit Withdraw(msg.sender, value, shareAmount);
    }

    function flashLoan(uint256 amount, IFlashReceiver receiver, bytes calldata data) external {
        uint256 before = asset.balanceOf(address(this));
        asset.transfer(address(receiver), amount);
        receiver.onFlashLoan(msg.sender, amount, data);
        require(asset.balanceOf(address(this)) >= before, "!repaid");
    }

    function harvest() external {
        uint256 profit = strategy.invest(asset.balanceOf(address(this)));
        _accrueFee(profit);
    }

    function setOracle(IOracle newOracle) external onlyOwner {
        emit OracleUpdated(address(oracle), address(newOracle));
        oracle = newOracle;
    }

    function emergencyWithdraw(address to) external onlyOwner {
        _sendOut(to, asset.balanceOf(address(this)));
    }

    function _computeShares(uint256 amount) internal view returns (uint256) {
        if (totalShares == 0) return amount;
        return amount * 1e18 / _price();
    }

    function _price() internal view returns (uint256) {
        return oracle.getSpotPrice(address(asset));
    }

    function _sendOut(address to, uint256 amount) internal {
        asset.transfer(to, amount);
    }

    function _accrueFee(uint256 profit) internal {
        uint256 fee = profit * feeBps / 10_000;
        shares[owner] += fee;
        totalShares += fee;
    }
}`;
