// node --experimental-strip-types src/features/atlas/utils/step-lines.check.ts
import assert from "node:assert/strict";
import type { Piece, Step } from "../types.ts";
import { resolveStepLines } from "./step-lines.ts";

const source = `modifier whenNotPaused() {
    require(!paused, "paused");
    _;
}
function deposit(uint256 amount) external whenNotPaused {
    uint256 minted = _computeShares(amount);
    asset.transferFrom(msg.sender, address(this), amount);
    shares[msg.sender] += minted;
    totalShares += minted;
    emit Deposit(msg.sender, amount, minted);
}
function _computeShares(uint256 amount) internal view returns (uint256) {
    if (totalShares == 0) return amount;
    return amount * 1e18 / _price();
}
function _price() internal view returns (uint256) {
    return oracle.getPrice(address(asset));
}`;
const lines = source.split("\n");
const at = (find: string) => lines.findIndex((l) => l.includes(find));
const piece = (
  id: string,
  sys: Piece["sys"],
  name: string,
  find = name,
  n = 1,
  x: Partial<Piece> = {},
): Piece => ({ id, sys, name, find, line: at(find), n, desc: "", ...x });
const pieces: Piece[] = [
  piece(
    "whenNotPaused",
    "access",
    "whenNotPaused",
    "modifier whenNotPaused() {",
    4,
  ),
  piece("deposit", "entry", "deposit()", "function deposit(", 7),
  piece(
    "_computeShares",
    "logic",
    "_computeShares()",
    "function _computeShares",
    4,
  ),
  piece("_price", "logic", "_price()", "function _price", 3),
  piece("paused", "storage", "slot 7 · paused", "paused"),
  piece("totalShares", "storage", "slot 5 · totalShares", "totalShares"),
  piece("shares", "storage", "slot 6 · shares[]", "shares["),
  piece("oracle", "storage", "slot 3 · oracle", "oracle"),
  piece("asset", "storage", "slot 2 · asset", "asset"),
  piece("getPrice", "calls", "oracle.getPrice", "oracle.getPrice", 1, {
    target: "oracle",
    member: "getPrice",
  }),
  piece(
    "transferFrom",
    "calls",
    "asset.transferFrom",
    "asset.transferFrom",
    1,
    { target: "asset", member: "transferFrom" },
  ),
  piece("evDeposit", "events", "Deposit", "emit Deposit"),
];
const seq: Step[] = [
  ["r", "paused"],
  ["r", "totalShares"],
  ["r", "oracle"],
  ["r", "asset"],
  ["c", "getPrice"],
  ["r", "asset"],
  ["c", "transferFrom"],
  ["w", "shares"],
  ["w", "totalShares"],
  ["e", "evDeposit"],
];
const got = resolveStepLines(
  { pieces, seq: { deposit: seq }, internal: ["_computeShares", "_price"] },
  lines,
  (p) => p.line ?? 0,
  "deposit",
).map((i) => i + 1);
// modifier → _computeShares → _price (oracle, asset, call) → body: second asset read is the transfer line
assert.deepEqual(got, [2, 13, 17, 17, 17, 7, 7, 8, 9, 10]);
console.log("step-lines ok");
