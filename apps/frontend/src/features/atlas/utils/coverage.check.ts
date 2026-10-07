// node --experimental-strip-types src/features/atlas/utils/coverage.check.ts
import assert from "node:assert/strict";
import type { AtlasData } from "../types";
import { coverageFocus, hitLabel, isStateChanging } from "./coverage.ts";

const c = (lh: number, lf: number, bh = 0, bf = 0, calls?: number) => ({
  lines: { hit: lh, found: lf },
  branches: { hit: bh, found: bf },
  calls,
});
const data = {
  entry: ["deposit", "withdraw", "setOracle", "flash", "peek"],
  pieces: [{ id: "cPrice", view: true }],
  seq: {
    deposit: [["w", "shares"]],
    withdraw: [["w", "shares"]],
    setOracle: [["w", "oracle"]],
    flash: [["c", "cTransfer"]],
    peek: [["c", "cPrice"]],
  },
  coverage: {
    pieces: {
      deposit: c(5, 5, 2, 2, 9),
      withdraw: c(7, 7, 2, 4, 9),
      setOracle: c(0, 2, 0, 0, 1),
      flash: c(0, 4, 0, 2, 0),
      peek: c(0, 1, 0, 0, 0),
    },
  },
} as unknown as AtlasData;

assert.equal(isStateChanging(data, "flash"), true);
assert.equal(isStateChanging(data, "peek"), false); // view call only
const { untested, gaps } = coverageFocus(data);
assert.deepEqual(
  untested.map((x) => [x.id, x.why]),
  [
    ["setOracle", "Only reverts, body never ran"],
    ["flash", "Never called by a test"],
  ],
);
assert.deepEqual(
  gaps.map((x) => [x.id, x.why]),
  [["withdraw", "2 branches never taken"]],
);
assert.equal(hitLabel(64214), "64k");
assert.equal(hitLabel(1234), "1.2k");
console.log("coverage ok");
