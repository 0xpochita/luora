// node --experimental-strip-types src/features/trace/utils/why.check.ts
import assert from "node:assert/strict";
import type { Frame, TestResult } from "../types.ts";
import { checksOf, forgeTree, whyOf } from "./why.ts";

const f = (d: number, fn: string, line?: number, extra: Partial<Frame> = {}) =>
  ({
    d,
    kind: "CALL",
    to: "C",
    contract: "C",
    file: null,
    fn,
    args: "",
    ret: "",
    ok: true,
    gas: 1,
    ...(line ? { callSite: { file: "t.sol", line } } : {}),
    ...extra,
  }) as Frame;
const src = [
  "",
  "vm.prank(alice);",
  "vault.deposit(1);",
  "assertEq(vault.shares(alice), 1);",
  "assertEq(usdc.balanceOf(v), 1);",
].join("\n");
const test = (status: string, reason: string | null = null) =>
  ({
    suite: "S",
    file: "t.sol",
    name: "test_x()",
    status,
    kind: { Unit: { gas: 9 } },
    reason,
    transfers: [],
    frames: [
      f(0, "test_x", undefined, { lines: { "t.sol": [2, 3, 4, 5] } }),
      f(1, "prank", 2),
      f(1, "deposit", 3),
      f(2, "transferFrom"),
      f(1, "shares", 4),
      f(1, "balanceOf", 5),
    ],
  }) as TestResult;

// the assert lines are the checks, with the calls made on them
const pass = checksOf(test("Success"), src);
assert.deepEqual(
  pass.checks.map((c) => [c.line, c.calls.map((x) => x.fn), c.ok]),
  [
    [4, ["shares"], true],
    [5, ["balanceOf"], true],
  ],
);
assert.match(
  whyOf(test("Success"), pass.checks),
  /this one did; its 2 assertions held\.$/,
);

// a failure stops at its last executed line: that check failed, the earlier one held
const failed = test("Failure", "1 != 2");
const fl = checksOf(failed, src);
assert.equal(fl.failLine, 5);
assert.deepEqual(
  fl.checks.map((c) => c.ok),
  [true, false],
);
assert.equal(
  whyOf(failed, fl.checks, fl.failLine),
  "Failed at line 5: 1 != 2.",
);
assert.match(whyOf(test("Skipped"), []), /^Skipped/);
const inv = {
  ...test("Success"),
  kind: { Invariant: { runs: 256, calls: 128000, reverts: 3 } },
} as TestResult;
assert.match(
  whyOf(inv, []),
  /128,000 random calls over 256 runs.*3 calls reverted/,
);

// forge -vvvv's tree: ├─ while siblings follow, └─ for the last, │ down an open branch
assert.deepEqual(
  forgeTree(test("Success").frames).map((l) => l.prefix + l.frame.fn),
  [
    "test_x",
    "├─ prank",
    "├─ deposit",
    "│  └─ transferFrom",
    "├─ shares",
    "└─ balanceOf",
  ],
);
console.log("why ok");
