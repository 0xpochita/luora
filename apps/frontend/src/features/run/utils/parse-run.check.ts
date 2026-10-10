// node --experimental-strip-types src/features/run/utils/parse-run.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRun } from "./parse-run.ts";

const sample = readFileSync(
  new URL("../../trace/fixtures/sample-trace.json", import.meta.url),
  "utf8",
);
const base = JSON.parse(sample);
const err = (v: unknown) => {
  const r = parseRun(typeof v === "string" ? v : JSON.stringify(v));
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
};

// the bundled sample is a real export: it must pass
assert.equal(parseRun(sample).ok, true);
// an export with a well-formed atlas passes, `atlas: null` (exporter skipped it) too
const atlas = {
  contract: "V",
  file: "src/V.sol",
  compiler: "0.8.24",
  source: "contract V {}",
  pieces: [{ id: "fDeposit", sys: "entry", name: "deposit" }],
  lesion: {},
  seq: {},
  callTarget: {},
  banks: [],
  entry: [],
  internal: [],
};
assert.equal(parseRun(JSON.stringify({ ...base, atlas })).ok, true);
assert.equal(parseRun(JSON.stringify({ ...base, atlas: null })).ok, true);

assert.match(err("{nope"), /^Not valid JSON/);
assert.match(err([1]), /top level/);
assert.match(err({ ...base, tests: undefined }), /Missing a `tests` array/);
assert.equal(
  err({ ...base, tests: [{ ...base.tests[0], frames: {} }] }),
  "tests[0].frames should be an array",
);
assert.equal(
  err({
    ...base,
    tests: [
      { ...base.tests[0], frames: [{ ...base.tests[0].frames[0], d: "1" }] },
    ],
  }),
  "tests[0].frames[0].d should be a number",
);
assert.equal(
  err({ ...base, forgeVersion: 1 }),
  "forgeVersion should be a string",
);
assert.match(err({ ...base, sources: { "a.sol": 1 } }), /^`sources`/);
assert.equal(
  err({ ...base, atlas: { ...atlas, pieces: "x" } }),
  "`atlas.pieces` should be an array",
);
assert.equal(
  err({ ...base, atlas: { ...atlas, source: undefined } }),
  "atlas.source should be a string",
);
assert.equal(
  err({ ...base, atlas: { ...atlas, pieces: [{ id: 1 }] } }),
  "atlas.pieces[0].id should be a string",
);
assert.equal(
  err({ ...base, atlas: { ...atlas, seq: [] } }),
  "atlas.seq should be an object",
);
console.log("parse-run ok");
