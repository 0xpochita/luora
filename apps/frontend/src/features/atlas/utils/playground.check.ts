// node --experimental-strip-types src/features/atlas/utils/playground.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Piece, Step } from "../types";
import {
  accessCheck,
  callDeltas,
  callerRoles,
  dropVerdict,
  findingsAt,
  formatUsdc,
  type PlayModel,
  parseUsdc,
  pathReport,
  reachOf,
  stepCaption,
  type TraceTest,
  traceBindings,
  traceCalls,
  verdictLine,
} from "./playground.ts";
import { resolveStepLines } from "./step-lines.ts";

const source = readFileSync(
  new URL("../../../../../../foundry/src/LuoraVault.sol", import.meta.url),
  "utf8",
);
const lines = source.split("\n");
const P = (
  id: string,
  sys: Piece["sys"],
  name: string,
  find: string,
  extra: Partial<Piece> = {},
): Piece => ({ id, sys, name, find, desc: "", ...extra });
const fnN = (find: string) => {
  const at = lines.findIndex((l) => l.includes(find));
  let n = 1;
  while (!/^ {4}}/.test(lines[at + n - 1] ?? "}")) n++;
  return n;
};
const fn = (id: string, find: string, extra: Partial<Piece> = {}) =>
  P(id, extra.sys ?? "entry", `${id}()`, find, { n: fnN(find), ...extra });
const pieces: Piece[] = [
  fn("deposit", "function deposit(", {
    caller: "anyone",
    links: [
      "whenNotPaused",
      "_computeShares",
      "cTransferFrom",
      "shares",
      "totalShares",
      "evDeposit",
      "noReentrancy",
    ],
  }),
  fn("withdraw", "function withdraw(", {
    caller: "anyone",
    links: ["_price", "cTransfer"],
  }),
  fn("harvestRewards", "function harvestRewards(", { caller: "keeper" }),
  fn("setOracle", "function setOracle(", {
    caller: "owner",
    links: ["onlyOwner", "oracle"],
  }),
  fn("whenNotPaused", "modifier whenNotPaused", {
    sys: "access",
    name: "whenNotPaused",
  }),
  fn("onlyOwner", "modifier onlyOwner", { sys: "access", name: "onlyOwner" }),
  P("noReentrancy", "access", "nonReentrant (missing)", "function deposit(", {
    ghost: true,
  }),
  fn("_computeShares", "function _computeShares", {
    sys: "logic",
    links: ["_price"],
  }),
  fn("_price", "function _price", { sys: "logic", links: ["cPrice"] }),
  P("owner", "storage", "slot 0 · owner", "address public owner;"),
  P("oracle", "storage", "slot 3 · oracle", "IOracle public oracle;"),
  P(
    "totalShares",
    "storage",
    "slot 5 · totalShares",
    "uint256 public totalShares;",
  ),
  P(
    "shares",
    "storage",
    "slot 6 · shares[]",
    "mapping(address => uint256) public shares;",
  ),
  P("paused", "storage", "slot 7 · paused", "bool public paused;"),
  P("cTransferFrom", "calls", "asset.transferFrom", "asset.transferFrom(", {
    target: "asset",
    member: "transferFrom",
  }),
  P("cTransfer", "calls", "asset.transfer", "asset.transfer(", {
    target: "asset",
    member: "transfer",
  }),
  P("cPrice", "calls", "oracle.getPrice", "oracle.getPrice(", {
    target: "oracle",
    member: "getPrice",
    view: true,
  }),
  P("dep", "deps", "IERC20", "interface IERC20"),
  P("evDeposit", "events", "Deposit", "event Deposit("),
  P(
    "f1",
    "vulns",
    "F-01 State written after external call in deposit()",
    "function deposit(",
    { risk: "high", links: ["deposit", "cTransferFrom", "shares"] },
  ),
  P(
    "f2",
    "vulns",
    "F-03 State written after external call in withdraw()",
    "function withdraw(",
    { risk: "high", links: ["withdraw", "cTransfer", "shares"] },
  ),
  P("f3", "vulns", "F-10 Strict equality", "function _computeShares", {
    risk: "med",
    links: ["_computeShares"],
  }),
];
const seq: Record<string, Step[]> = {
  deposit: [
    ["r", "paused"],
    ["r", "totalShares"],
    ["r", "oracle"],
    ["c", "cPrice"],
    ["c", "cTransferFrom"],
    ["w", "shares"],
    ["w", "totalShares"],
    ["e", "evDeposit"],
  ],
  withdraw: [
    ["r", "shares"],
    ["c", "cPrice"],
    ["c", "cTransfer"],
    ["w", "shares"],
    ["w", "totalShares"],
  ],
  setOracle: [
    ["r", "owner"],
    ["w", "oracle"],
  ],
  harvestRewards: [],
};
const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
const lineOf = (p: Piece) =>
  Math.max(
    0,
    lines.findIndex((l) => l.includes(p.find)),
  );
const data = { pieces, seq, internal: ["_computeShares", "_price"] };
const m: PlayModel = {
  byId,
  pieces,
  lines,
  lineOf,
  seq,
  entry: ["deposit", "withdraw", "harvestRewards", "setOracle"],
  internal: data.internal,
  findings: pieces.filter((p) => p.sys === "vulns"),
  lesion: { f1: "deposit", f2: "withdraw", f3: "_computeShares" },
  callTarget: { cTransferFrom: "dep", cTransfer: "dep" },
  contract: "LuoraVault",
  coverage: undefined,
  stepLines: (e: string) => resolveStepLines(data, lines, lineOf, e),
};

// amounts: 6 decimals, no invented precision
assert.equal(parseUsdc("1,000"), 1_000_000_000n);
assert.equal(parseUsdc("0.5"), 500_000n);
assert.equal(parseUsdc("1.0000001"), null);
assert.equal(parseUsdc("-1"), null);
assert.equal(formatUsdc(1_000_500_000n), "1,000.5 USDC");
assert.equal(formatUsdc(-1_000_000_000n), "−1,000 USDC");

// roles come from Piece.caller
assert.deepEqual(callerRoles(m), ["anyone", "keeper", "owner"]);

// access: modifier, inline require, open function
const so = accessCheck(m, "setOracle", "anyone");
assert.equal(so.pass, false);
assert.equal(so.guard?.id, "onlyOwner");
assert.equal(so.caption, "REVERTS · onlyOwner (require msg.sender == owner)");
assert.match(lines[so.guard?.line ?? 0], /require\(msg\.sender == owner/);
assert.equal(accessCheck(m, "setOracle", "owner").pass, true);
const hr = accessCheck(m, "harvestRewards", "owner");
assert.equal(hr.caption, "REVERTS · require(msg.sender == keeper)");
assert.equal(hr.guard?.id, null);
assert.equal(accessCheck(m, "deposit", "anyone").pass, true);

// captions: amount only where the parameter is passed directly
const ctx = { amount: "1,000 USDC", caller: "caller" };
const at = (needle: string) => lines.findIndex((l) => l.includes(needle));
assert.equal(
  stepCaption(m, "deposit", at("asset.transferFrom("), ctx),
  "asset.transferFrom(caller, vault, 1,000 USDC)",
);
assert.equal(
  stepCaption(m, "deposit", at("shares[msg.sender] += minted"), ctx),
  "shares[caller] += minted",
);
assert.equal(
  stepCaption(m, "deposit", at("uint256 minted ="), ctx),
  "uint256 minted = _computeShares(1,000 USDC)",
);
// helper line: `amount * 1e18` stays symbolic (not the entry's own line, and inside arithmetic)
assert.equal(
  stepCaption(m, "deposit", at("return amount * 1e18"), ctx),
  "return amount * 1e18 / _price()",
);
// withdraw's shareAmount is a share count, not USDC
assert.equal(
  stepCaption(m, "withdraw", at("shares[msg.sender] -= shareAmount"), ctx),
  "shares[caller] -= shareAmount",
);

// deltas: symbolic from the source
const d = callDeltas(m, "deposit", ctx);
assert.equal(d.caller, "−1,000 USDC");
assert.equal(d.vault, "+1,000 USDC");
assert.equal(d.writes.totalShares, "+= minted");
assert.equal(callDeltas(m, "withdraw", ctx).vault, "− value");

// trace: prank caller, events, transfers, bound identifiers
const frame = (
  d: number,
  contract: string | null,
  f: string,
  args = "",
  kind = "CALL",
  to = contract ?? "",
) => ({
  d,
  kind,
  to,
  contract,
  fn: f,
  args,
  ret: "",
  ok: true,
});
const tests: TraceTest[] = [
  {
    name: "test_deposit()",
    frames: [
      frame(0, "LuoraVaultTest", "test_deposit"),
      frame(1, "vm", "prank", "msgSender=alice"),
      frame(1, "LuoraVault", "deposit", "amount=1000000000"),
      frame(
        2,
        "MockUSDC",
        "transferFrom",
        "from=alice, to=LuoraVault, amount=1000000000",
      ),
      frame(
        3,
        "MockUSDC",
        "Transfer",
        "from=alice, to=LuoraVault, value=1000000000",
        "EVENT",
      ),
      frame(
        2,
        "LuoraVault",
        "Deposit",
        "user=alice, assets=1000000000, shares=1000000000",
        "EVENT",
      ),
      frame(1, "LuoraVault", "shares", "arg0=alice"),
    ],
  },
];
const calls = traceCalls(tests, "LuoraVault");
assert.equal(calls.length, 2);
assert.equal(calls[0].caller, "alice");
assert.equal(calls[1].caller, null, "prank lasts one call");
assert.deepEqual(calls[0].events, [
  "Deposit(user=alice, assets=1000000000, shares=1000000000)",
]);
assert.equal(
  calls[0].calls[0],
  "MockUSDC.transferFrom(from=alice, to=LuoraVault, amount=1000000000)",
);
const bound = traceBindings(m, "deposit", calls[0]);
assert.equal(bound.amount, "1000000000");
assert.equal(
  bound.minted,
  "1000000000",
  "emit Deposit(_, amount, minted) ↔ Deposit.shares",
);
assert.equal(
  stepCaption(m, "deposit", at("totalShares += minted"), { ...ctx, bound }),
  "totalShares += minted (=1,000,000,000)",
);
const real = callDeltas(m, "deposit", { ...ctx, caller: "alice" }, calls[0]);
assert.equal(real.caller, "−1,000 USDC");
assert.equal(real.vault, "+1,000 USDC");

// drop targets
const v = dropVerdict(m, "setOracle", "anyone");
assert.equal(v?.kind, "call");
assert.equal(dropVerdict(m, "f1", "anyone"), null);
assert.deepEqual(reachOf(m, "shares"), [
  { entry: "deposit", how: "writes" },
  { entry: "withdraw", how: "writes + reads" },
]);
assert.deepEqual(reachOf(m, "dep"), [
  { entry: "deposit", how: "calls", order: "before state writes" },
  { entry: "withdraw", how: "calls", order: "before state writes" },
]);
assert.deepEqual(reachOf(m, "_price"), [
  { entry: "deposit", how: "runs" },
  { entry: "withdraw", how: "runs" },
]);
assert.deepEqual(reachOf(m, "noReentrancy"), [
  { entry: "deposit", how: "missing on" },
]);
const sv = dropVerdict(m, "shares", "anyone");
assert.ok(sv);
assert.equal(
  verdictLine(m, sv),
  "No call · writes by ENT-01 deposit(), ENT-02 withdraw()",
);

// report: findings on deposit's path only (withdraw's CEI finding shares a slot, not the path)
const r = pathReport(m, "deposit");
assert.equal(r.steps, 8);
assert.deepEqual(r.written, ["slot 6 · shares[]", "slot 5 · totalShares"]);
assert.deepEqual(
  r.findings.map((f) => f.id),
  ["f1", "f3"],
);
assert.deepEqual([...findingsAt(m, "deposit", -1)].sort(), ["f1", "f3"]);
console.log("playground ok");
