// node --experimental-strip-types src/features/atlas/utils/audit.check.ts
import assert from "node:assert/strict";
import type { Piece } from "../types.ts";
import { findingGroups, linesOf, pieceAtLine, shortTitle } from "./audit.ts";

const lines = [
  "uint256 public totalShares;", // 0
  "function deposit(uint256 a) external {", // 1
  "    asset.transferFrom(msg.sender, address(this), a);", // 2
  "    totalShares += a;", // 3
  "}", // 4
  "// totalShares is the supply", // 5
];
const P = (
  id: string,
  sys: Piece["sys"],
  name: string,
  line: number,
  x: Partial<Piece> = {},
): Piece => ({ id, sys, name, find: "", line, desc: "", ...x });
const pieces = [
  P("totalShares", "storage", "slot 5 · totalShares", 0),
  P("deposit", "entry", "deposit()", 1, { n: 4 }),
  P("guard", "access", "nonReentrant (missing)", 1, { ghost: true }),
  P("call", "calls", "asset.transferFrom", 2, {
    target: "asset",
    member: "transferFrom",
  }),
  P("f1", "vulns", "F-01 State written after external call in deposit()", 1, {
    mark: [2],
    risk: "high",
  }),
  P("f2", "vulns", "F-02 Unchecked ERC20 return", 2, { risk: "med" }),
  P("f3", "vulns", "F-03 No reentrancy guard", 1, { risk: "low" }),
];
const model = {
  pieces,
  lines,
  findings: pieces.filter((p) => p.sys === "vulns"),
  lesion: { f1: "deposit", f2: "call", f3: "deposit" } as Record<
    string,
    string
  >,
  lineOf: (p: Piece) => p.line ?? 0,
};

assert.equal(shortTitle(pieces[4]), "State written after external call");
assert.equal(shortTitle(pieces[4], 12), "State writt…");
assert.deepEqual(
  findingGroups(model).map((g) => [g.host, g.findings.map((f) => f.id)]),
  [
    ["deposit", ["f1", "f3"]],
    ["call", ["f2"]],
  ],
);
// slot lights its declaration and every use, not comments
assert.deepEqual(linesOf(model, pieces[0]), [0, 3]);
assert.deepEqual(linesOf(model, pieces[1]), [1, 2, 3, 4]);
assert.equal(pieceAtLine(model, 1), "deposit"); // header beats the ghost guard and F-03
assert.equal(pieceAtLine(model, 2), "call"); // call site beats its function
assert.equal(pieceAtLine(model, 3), "f1"); // red line → finding
assert.equal(pieceAtLine(model, 4), "deposit");
assert.equal(pieceAtLine(model, 5), null);
console.log("audit ok");
