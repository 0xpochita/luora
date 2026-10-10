// node --experimental-strip-types src/features/trace/utils/ask.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { LuoraData } from "../types";
import {
  parseRange,
  rangeLabel,
  rangeParam,
  selectionText,
  suggestions,
  traceAskPrompt,
} from "./ask.ts";

const data: LuoraData = JSON.parse(
  readFileSync(
    new URL("../fixtures/sample-trace.json", import.meta.url),
    "utf8",
  ),
);
const test = data.tests.find((t) => t.name === "test_depositThenWithdraw()");
assert.ok(test);
const fr = test.frames;

// one call: its line, the callers above it, its source, the question last
const one = traceAskPrompt(
  data,
  test,
  { from: 7, to: 7 },
  "What does this call do?",
);
assert.match(
  one,
  /^<context>\nFoundry test: test_depositThenWithdraw\(\) in test\/LuoraVault\.t\.sol, passed/,
);
assert.match(
  one,
  /Called through: #0 LuoraVaultTest\.test_depositThenWithdraw/,
);
assert.match(one, /\n#7 CALL LuoraVault\.deposit\(amount=1000000000\)/);
assert.match(one, /--- src\/LuoraVault\.sol/);
assert.match(
  one,
  /What does this call do\?\nRefer to calls by their #number\.$/,
);
assert.doesNotMatch(one, /#8 /, "a single call never leaks its neighbours");

// a range: every call in it, indented under the first by depth
const many = traceAskPrompt(data, test, { from: 7, to: 11 }, "q");
for (const i of [7, 8, 9, 10, 11]) assert.match(many, new RegExp(`#${i} `));
assert.match(many, /\n {2}#8 STATICCALL MockOracle\.getPrice/);
assert.match(many, /\n {4}#10 EVENT MockUSDC\.Transfer/);

// cheatcodes read as CHEATCODE
assert.match(
  traceAskPrompt(data, test, { from: 1, to: 1 }, "q"),
  /#1 CHEATCODE vm\.prank/,
);

// labels, suggestions and the URL form
assert.equal(rangeLabel({ from: 7, to: 7 }), "#7");
assert.equal(rangeLabel({ from: 7, to: 11 }), "#7–#11");
assert.equal(
  selectionText(fr, { from: 7, to: 11 }),
  "#7–#11 · 5 calls from LuoraVault.deposit",
);
assert.equal(suggestions(fr, { from: 7, to: 7 })[0], "What does this call do?");
assert.equal(
  suggestions(fr, { from: 1, to: 1 })[0],
  "What does this cheatcode set up for the test?",
);
assert.equal(
  suggestions(fr, { from: 7, to: 9 })[0],
  "Walk me through these calls in order",
);
assert.deepEqual(parseRange("11-7"), { from: 7, to: 11 });
assert.deepEqual(parseRange("3"), { from: 3, to: 3 });
assert.equal(parseRange("x"), null);
assert.equal(rangeParam({ from: 7, to: 11 }), "7-11");

// nothing in the prompts asks for an attack
for (const r of [
  { from: 7, to: 7 },
  { from: 1, to: 1 },
  { from: 7, to: 9 },
])
  for (const q of suggestions(fr, r))
    assert.doesNotMatch(q, /exploit|attack|drain|steal/i);

console.log("trace ask ok");
