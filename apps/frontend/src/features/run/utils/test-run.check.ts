// node --experimental-strip-types src/features/run/utils/test-run.check.ts
import assert from "node:assert/strict";
import type { TestResult } from "../../trace/types.ts";
import {
  applyProgress,
  clock,
  exportArgs,
  FORK_CHAINS,
  kindDetail,
  parseEvent,
  splitChain,
  summarize,
} from "./test-run.ts";

// the Start test menu lists exactly the exporter's chains (foundry/luora-chains.mjs)
const { CHAINS } = (await import(
  new URL("../../../../../../foundry/luora-chains.mjs", import.meta.url).href
)) as {
  CHAINS: Record<string, { name: string; family: string; id: number }>;
};
assert.deepEqual(
  FORK_CHAINS.map((c) => [c.key, c.name, c.family, c.id]),
  Object.entries(CHAINS).map(([k, c]) => [k, c.name, c.family, c.id]),
);

// only the local run or one well-formed fork key: never a flag, a path or a list
assert.deepEqual(exportArgs({}), []);
assert.deepEqual(exportArgs({ fork: "" }), []);
assert.deepEqual(exportArgs({ fork: "base-sepolia" }), [
  "--forks",
  "base-sepolia",
]);
for (const fork of [
  "--mt",
  "-x",
  "all",
  "mainnet",
  "all,sepolia",
  "../x",
  "Base",
  "a b",
  7,
  ["sepolia"],
])
  assert.equal(typeof exportArgs({ fork }), "string", String(fork));
assert.equal(typeof exportArgs(null), "string");
assert.equal(typeof exportArgs([]), "string");

assert.equal(kindDetail({ Unit: { gas: 107704 } }), "gas: 107,704");
assert.equal(
  kindDetail({ Invariant: { runs: 256, calls: 128000, reverts: 110 } }),
  "runs: 256, calls: 128,000, reverts: 110",
);

const t = (name: string, status: string, reason: string | null = null) =>
  ({
    suite: "S",
    file: "f",
    name,
    status,
    kind: { Unit: { gas: 1 } },
    reason,
    frames: [],
    transfers: [],
  }) as TestResult;
const s = summarize([
  t("a()", "Success"),
  t("b()", "Skipped"),
  t("c()", "Failure", "1 != 2"),
]);
assert.deepEqual(
  s.rows.map((r) => r.name),
  ["c()", "a()", "b()"],
  "failures first",
);
assert.deepEqual([s.passed, s.failed, s.skipped], [1, 1, 1]);
assert.equal(s.rows[0].reason, "1 != 2");

assert.deepEqual(parseEvent('{"log":"luora: x","at":3}'), {
  log: "luora: x",
  at: 3,
});
assert.equal(parseEvent("not json"), null);
assert.equal(parseEvent('{"other":1}'), null);
assert.equal(clock(83), "1:23");
assert.deepEqual(
  FORK_CHAINS.map((c) => splitChain(c.name)),
  [
    ["Ethereum", "Sepolia"],
    ["Arbitrum", "Sepolia"],
    ["Base", "Sepolia"],
    ["Robinhood Chain", "Testnet"],
    ["HyperEVM", "Testnet"],
    ["Tempo", "Moderato"],
  ],
);
assert.deepEqual(splitChain("Anvil"), ["Anvil", ""]);
// the log's live tests: planned as running, then each result in place; a fork run after it
let g = applyProgress([], {
  run: "local",
  plan: [
    { suite: "S", name: "test_a" },
    { suite: "S", name: "testFuzz_b" },
  ],
});
assert.deepEqual(
  g[0].rows.map((r) => [r.name, r.outcome]),
  [
    ["test_a()", "running"],
    ["testFuzz_b()", "running"],
  ],
);
g = applyProgress(g, {
  run: "local",
  result: {
    suite: "S",
    name: "testFuzz_b(uint256)",
    status: "Failure",
    reason: "x",
    kind: { Fuzz: { runs: 1 } },
  },
});
assert.deepEqual(
  g[0].rows.map((r) => [r.name, r.outcome]),
  [
    ["test_a()", "running"],
    ["testFuzz_b(uint256)", "fail"],
  ],
);
g = applyProgress(g, {
  run: "base-sepolia",
  plan: [{ suite: "S", name: "test_a" }],
});
assert.deepEqual(
  g.map((x) => x.run),
  ["local", "base-sepolia"],
);
assert.equal(applyProgress(g, {} as never), g);
console.log("test-run ok");
