// node --experimental-strip-types src/features/atlas/utils/protocols.check.ts
import assert from "node:assert/strict";
import { protocolOf } from "./protocols.ts";

const id = (name: string, desc = "", target?: string, member?: string) =>
  protocolOf({ sys: "deps", name, desc, target, member })?.id ?? null;

assert.equal(id("IUniswapV2Router02"), "uniswap");
assert.equal(
  id("router.swapExactTokensForTokens", "Swaps rewards to USDC."),
  "uniswap",
);
assert.equal(id("x", "", "swapRouter", "exactInputSingle"), "uniswap");
assert.equal(id("ISwapRouter"), "uniswap");
assert.equal(id("IPool"), "aave");
assert.equal(id("pool.supply", "", "pool", "supply"), "aave");
assert.equal(id("AggregatorV3Interface"), "chainlink");
assert.equal(id("feed.latestRoundData"), "chainlink");
assert.equal(id("ICurvePool"), "curve");
assert.equal(id("ICToken"), "compound");
assert.equal(id("IWstETH"), "lido");
assert.equal(id("usdc.transfer", "", "usdc", "transfer"), "usdc");
assert.equal(id("IWETH"), "weth");
assert.equal(id("IERC20 token", "Total supply of the token."), null);
// generic callback, the vault's own flash loan and mocks are not Aave / USDC
assert.equal(id("receiver.onFlashLoan", "", "receiver", "onFlashLoan"), null);
assert.equal(id("IFlashReceiver"), null);
assert.equal(id("MockUSDC"), null);
assert.equal(id("IOracle", "Price feed."), null);
assert.equal(
  protocolOf({ sys: "entry", name: "depositUSDC()", desc: "" }),
  null,
);
console.log("protocols ok");
