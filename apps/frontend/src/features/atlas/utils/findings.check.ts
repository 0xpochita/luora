// node --experimental-strip-types src/features/atlas/utils/findings.check.ts
import assert from "node:assert/strict";
import type { AtlasData, Piece, Risk } from "../types.ts";
import { findingsReport, lineRanges, splitFix } from "./findings.ts";

assert.equal(lineRanges([76, 74, 77, 78]), "75, 77–79");
assert.deepEqual(splitFix("Bad thing. Fix: do it right."), [
  "Bad thing.",
  "do it right.",
]);

const source = [
  "contract V {",
  "  function w() external {",
  "    t.transfer(a, b);",
  "    s -= 1;",
  "  }",
  "}",
].join("\n");
const f = (id: string, risk: Risk, mark: number[]): Piece => ({
  id,
  sys: "vulns",
  name: `F-0${id} Issue ${id}`,
  find: "",
  line: 1,
  n: 4,
  mark,
  risk,
  desc: `What ${id}. Fix: How ${id}.`,
  reports: [
    { tool: "slither", detector: "reentrancy-no-eth", risk, confidence: "med" },
    { tool: "aderyn", detector: "reentrancy-state-change", risk },
  ],
});
const data = {
  contract: "V",
  file: "src/V.sol",
  compiler: "0.8.20",
  source,
  pieces: [f("1", "low", [1]), f("2", "high", [1, 2]), f("3", "med", [0])],
} as AtlasData;

const md = findingsReport(
  data,
  {
    "1": { status: "confirmed", note: "" },
    "2": { status: "confirmed", note: "Checked against tests." },
    "3": { status: "false-positive", note: "" },
  },
  new Date("2026-10-08"),
);
// only confirmed, worst first, numbered per severity
assert.ok(md.indexOf("## [H-01] Issue 2") < md.indexOf("## [L-01] Issue 1"));
assert.ok(!md.includes("Issue 3"));
assert.ok(md.includes("| 2 confirmed (1 High, 1 Low) |"));
assert.ok(md.includes("- `src/V.sol:3-4`"));
assert.ok(
  md.includes("    t.transfer(a, b); // @audit\n    s -= 1; // @audit"),
);
assert.ok(
  md.includes(
    "Slither `reentrancy-no-eth` (confidence Medium), Aderyn `reentrancy-state-change`",
  ),
);
assert.ok(md.includes("### Description\n\nWhat 2.\n"));
assert.ok(md.includes("### Recommendation\n\nHow 2."));
assert.ok(md.includes("### Auditor note\n\nChecked against tests."));
assert.ok(findingsReport(data, {}).includes("_No confirmed findings._"));
console.log("findings report ok");
