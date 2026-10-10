// node --experimental-strip-types src/features/atlas/utils/ai.check.ts
import assert from "node:assert/strict";
import type { Piece } from "../types";
import {
  CONTRACT_QUESTIONS,
  contractAskPrompt,
  PIECE_QUESTIONS,
} from "./ai.ts";
import type { AtlasModel } from "./model";

const piece = (p: Partial<Piece> & Pick<Piece, "id" | "sys" | "name">): Piece =>
  ({ desc: "", find: p.name, ...p }) as Piece;
const pieces = [
  piece({
    id: "deposit",
    sys: "entry",
    name: "deposit()",
    caller: "anyone",
    desc: "Pulls tokens, mints shares.",
  }),
  piece({
    id: "setOracle",
    sys: "entry",
    name: "setOracle()",
    caller: "owner",
    desc: "Swaps the price feed.",
  }),
  piece({
    id: "onlyOwner",
    sys: "access",
    name: "onlyOwner",
    desc: "Owner only.",
  }),
  piece({
    id: "shares",
    sys: "storage",
    name: "shares",
    slot: 5,
    desc: "Shares per user.",
  }),
  piece({ id: "dep", sys: "deps", name: "IOracle", desc: "Price feed." }),
  piece({ id: "ev", sys: "events", name: "Deposit" }),
  piece({
    id: "f1",
    sys: "vulns",
    name: "F-01 External call before state update",
    risk: "high",
    desc: "Write after call.",
  }),
];
const lines = Array.from({ length: 450 }, (_, i) => `// line ${i + 1}`);
const m = {
  contract: "Vault",
  file: "src/Vault.sol",
  compiler: "0.8.20",
  pieces,
  findings: pieces.filter((p) => p.sys === "vulns"),
  byId: Object.fromEntries(pieces.map((p) => [p.id, p])),
  lines,
  coverage: undefined,
} as unknown as AtlasModel;

const p = contractAskPrompt(m, "What should an auditor check first?");
assert.match(
  p,
  /^<context>\nContract: Vault \(src\/Vault\.sol\), solc 0\.8\.20/,
);
assert.match(p, /- deposit\(\) · anyone · Pulls tokens, mints shares\./);
assert.match(p, /- setOracle\(\) · owner · Swaps the price feed\./);
assert.match(p, /- shares \(slot 5\): Shares per user\./);
assert.match(
  p,
  /- F-01 External call before state update \(High\): Write after call\./,
);
assert.match(p, /Test coverage: not measured/);
assert.match(p, /Source \(first 400 of 450 lines\):/);
assert.match(p, /\n 400 {2}\/\/ line 400\n<\/context>/);
assert.doesNotMatch(p, /line 401/, "source is capped");
assert.match(
  p,
  /What should an auditor check first\?\nRefer to functions as name\(\) and to findings by their F-number\.$/,
);

// every suggested question stays defensive
for (const q of [...CONTRACT_QUESTIONS, ...Object.keys(PIECE_QUESTIONS)])
  assert.doesNotMatch(q, /exploit|attack|drain|steal/i);

console.log("atlas ai ok");
