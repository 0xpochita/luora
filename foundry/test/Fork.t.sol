// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

/// Multicall3: deployed at the same address on Ethereum, Arbitrum, Base, Robinhood Chain, HyperEVM
/// and Tempo (testnets included).
interface IMulticall3 {
    function getChainId() external view returns (uint256);
    function getBlockNumber() external view returns (uint256);
}

/// Runs only on a fork (`node luora-export.mjs --chain …`): reads a contract that really lives on
/// that chain, so the trace shows a call into deployed code. Skipped on a plain local run.
contract ForkTest is Test {
    IMulticall3 constant MULTICALL3 = IMulticall3(0xcA11bde05977b3631167028862bE2a173976CA11);

    function test_fork_readsTheLiveChain() public {
        if (address(MULTICALL3).code.length == 0) vm.skip(true);
        vm.label(address(MULTICALL3), "Multicall3");
        assertEq(MULTICALL3.getChainId(), block.chainid, "Multicall3 sees the forked chain");
        assertEq(MULTICALL3.getBlockNumber(), block.number, "and the forked block");
    }
}
