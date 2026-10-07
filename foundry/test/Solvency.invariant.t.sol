// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LuoraVault, IERC20, IOracle, IStrategy, IUniswapV2Router02} from "../src/LuoraVault.sol";
import {MockUSDC, MockOracle, MockStrategy, MockUniswapRouter} from "../src/mocks/Mocks.sol";

/// Drives the vault with random deposits / withdrawals from a few users.
contract Handler is Test {
    LuoraVault vault;
    MockUSDC usdc;
    address[3] users = [address(0xA11CE), address(0xB0B), address(0xCA7)];

    constructor(LuoraVault _vault, MockUSDC _usdc) {
        vault = _vault;
        usdc = _usdc;
        for (uint256 i; i < users.length; i++) {
            usdc.mint(users[i], 1_000_000e6);
            vm.prank(users[i]);
            usdc.approve(address(vault), type(uint256).max);
        }
    }

    function deposit(uint256 who, uint256 amount) external {
        address u = users[who % users.length];
        amount = bound(amount, 1e6, 100_000e6);
        vm.prank(u);
        vault.deposit(amount);
    }

    function withdraw(uint256 who, uint256 amount) external {
        address u = users[who % users.length];
        uint256 held = vault.shares(u);
        if (held == 0) return;
        amount = bound(amount, 1, held);
        vm.prank(u);
        vault.withdraw(amount);
    }
}

contract SolvencyInvariantTest is Test {
    LuoraVault vault;
    MockUSDC usdc;
    Handler handler;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new LuoraVault(
            IERC20(address(usdc)),
            IOracle(address(new MockOracle())),
            IStrategy(address(new MockStrategy())),
            address(this),
            IUniswapV2Router02(address(new MockUniswapRouter())),
            IERC20(address(new MockUSDC()))
        );
        handler = new Handler(vault, usdc);
        targetContract(address(handler));
    }

    /// Every share must stay fully backed by USDC held in the vault.
    function invariant_solvency() public view {
        assertGe(usdc.balanceOf(address(vault)), vault.totalShares());
    }
}
