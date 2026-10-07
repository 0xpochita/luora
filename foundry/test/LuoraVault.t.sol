// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LuoraVault, IERC20, IOracle, IStrategy, IUniswapV2Router02} from "../src/LuoraVault.sol";
import {MockUSDC, MockOracle, MockStrategy, MockUniswapRouter} from "../src/mocks/Mocks.sol";

contract LuoraVaultTest is Test {
    LuoraVault vault;
    MockUSDC usdc;
    MockOracle oracle;
    MockStrategy strategy;
    MockUniswapRouter router;
    MockUSDC reward;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address keeper = makeAddr("keeper");

    function setUp() public {
        usdc = new MockUSDC();
        oracle = new MockOracle();
        strategy = new MockStrategy();
        router = new MockUniswapRouter();
        reward = new MockUSDC();
        vault = new LuoraVault(
            IERC20(address(usdc)),
            IOracle(address(oracle)),
            IStrategy(address(strategy)),
            keeper,
            IUniswapV2Router02(address(router)),
            IERC20(address(reward))
        );
        usdc.mint(alice, 5_000e6);
        usdc.mint(bob, 20_000e6);
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_deposit() public {
        vm.prank(alice);
        vault.deposit(1_000e6);
        assertEq(vault.shares(alice), 1_000e6);
        assertEq(usdc.balanceOf(address(vault)), 1_000e6);
    }

    function test_depositThenWithdraw() public {
        vm.prank(bob);
        vault.deposit(20_000e6);
        vm.startPrank(alice);
        vault.deposit(1_000e6);
        vault.withdraw(1_000e6);
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), 5_000e6);
        assertEq(vault.totalShares(), 20_000e6);
    }

    function test_harvestMovesFundsToStrategy() public {
        vm.prank(alice);
        vault.deposit(1_000e6);
        vault.harvest();
        assertEq(usdc.balanceOf(address(strategy)), 1_000e6);
        assertEq(vault.shares(vault.owner()), 0.1e6); // 2% profit × 0.5% fee
    }

    function test_harvestRewards_swapsToAsset() public {
        reward.mint(address(vault), 50e6);
        vm.prank(keeper);
        vault.harvestRewards(50e6, block.timestamp);
        assertEq(reward.balanceOf(address(vault)), 0);
        assertEq(usdc.balanceOf(address(vault)), 50e6);
    }

    function test_harvestRewards_onlyKeeper() public {
        vm.prank(alice);
        vm.expectRevert("!keeper");
        vault.harvestRewards(0, block.timestamp);
    }

    function test_setOracle_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert("!owner");
        vault.setOracle(IOracle(address(0xBEEF)));
    }

    function test_pause_blocksDeposits() public {
        vm.prank(keeper);
        vault.pause();
        vm.prank(alice);
        vm.expectRevert("paused");
        vault.deposit(1e6);
    }
}
