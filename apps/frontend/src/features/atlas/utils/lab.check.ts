// node --experimental-strip-types src/features/atlas/utils/lab.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Piece, Step } from "../types";
import { foundryTest, type LabModel, solAmount } from "./lab-foundry.ts";
import {
  COL,
  connect,
  contractGraph,
  GAP,
  nodeHeight,
  portPos,
  revertsOf,
  type Wire,
  wireError,
} from "./lab-graph.ts";
import {
  assertOptions,
  runScenario,
  type Scenario,
  scenarioCard,
  scenarioOrder,
  templates,
} from "./lab-scenario.ts";
import type { TraceCall } from "./playground.ts";
import { resolveStepLines } from "./step-lines.ts";

// ---- LuoraVault fixture, shaped like the luora-export atlas -------------------------
const source = readFileSync(
  new URL("../../../../../../foundry/src/LuoraVault.sol", import.meta.url),
  "utf8",
);
const lines = source.split("\n");
const at = (s: string) => lines.findIndex((l) => l.includes(s));
const span = (find: string) => {
  let n = 1;
  while (!/^ {4}}/.test(lines[at(find) + n - 1] ?? "}")) n++;
  return n;
};
const P = (
  id: string,
  sys: Piece["sys"],
  name: string,
  find: string,
  x: Partial<Piece> = {},
): Piece => ({
  id,
  sys,
  name,
  find,
  desc: "",
  line: at(find),
  ...x,
});
const fn = (id: string, caller: string, links: string[] = []) =>
  P(id, "entry", `${id}()`, `function ${id}(`, {
    n: span(`function ${id}(`),
    caller,
    links,
  });
const slot = (name: string, n: number, decl: string, mapping = false) =>
  P(name, "storage", `slot ${n} · ${name}${mapping ? "[]" : ""}`, decl, {
    slot: n,
    mapping,
  });
const call = (target: string, member: string, dep: string, view = false) =>
  P(
    `c_${target}_${member}`,
    "calls",
    `${target}.${member}`,
    `${target}.${member}(`,
    { target, member, view, links: [dep, target] },
  );
const pieces: Piece[] = [
  fn("deposit", "anyone", [
    "whenNotPaused",
    "_computeShares",
    "c_asset_transferFrom",
    "shares",
    "totalShares",
    "evDeposit",
  ]),
  fn("withdraw", "anyone", [
    "whenNotPaused",
    "_price",
    "c_asset_transfer",
    "shares",
    "totalShares",
    "evWithdraw",
  ]),
  fn("harvest", "anyone", ["_accrueFee"]),
  fn("harvestRewards", "keeper"),
  fn("setOracle", "owner", ["onlyOwner", "oracle"]),
  fn("pause", "keeper", ["paused"]),
  P("whenNotPaused", "access", "whenNotPaused", "modifier whenNotPaused", {
    n: 4,
  }),
  P("onlyOwner", "access", "onlyOwner", "modifier onlyOwner", { n: 4 }),
  P("ctor", "logic", "constructor", "constructor(", {
    n: span("constructor("),
  }),
  P("_computeShares", "logic", "_computeShares()", "function _computeShares", {
    n: 4,
    links: ["_price"],
  }),
  P("_price", "logic", "_price()", "function _price", { n: 3 }),
  P("_accrueFee", "logic", "_accrueFee()", "function _accrueFee", { n: 5 }),
  slot("owner", 0, "address public owner;"),
  slot("keeper", 1, "address public keeper;"),
  slot("asset", 2, "IERC20 public asset;"),
  slot("oracle", 3, "IOracle public oracle;"),
  slot("strategy", 4, "IStrategy public strategy;"),
  slot("totalShares", 5, "uint256 public totalShares;"),
  slot("shares", 6, "mapping(address => uint256) public shares;", true),
  slot("paused", 7, "bool public paused;"),
  slot("feeBps", 8, "uint256 public feeBps"),
  slot("router", 9, "IUniswapV2Router02 public router;"),
  slot("rewardToken", 10, "IERC20 public rewardToken;"),
  call("asset", "transferFrom", "dep_IERC20"),
  call("oracle", "getPrice", "dep_IOracle", true),
  call("asset", "transfer", "dep_IERC20"),
  call("asset", "balanceOf", "dep_IERC20", true),
  call("strategy", "invest", "dep_IStrategy"),
  P("dep_IERC20", "deps", "IERC20", "interface IERC20"),
  P("dep_IOracle", "deps", "IOracle", "interface IOracle"),
  P("dep_IStrategy", "deps", "IStrategy", "interface IStrategy"),
  P(
    "dep_IUniswapV2Router02",
    "deps",
    "IUniswapV2Router02",
    "interface IUniswapV2Router02",
  ),
  P("evDeposit", "events", "Deposit", "event Deposit"),
  P("evWithdraw", "events", "Withdraw", "event Withdraw"),
  P(
    "f1",
    "vulns",
    "F-01 State written after external call in deposit()",
    "function deposit(",
    { risk: "high", links: ["deposit", "c_asset_transferFrom"] },
  ),
  P("f6", "vulns", "F-19 Privileged functions", "function setOracle(", {
    risk: "low",
    links: ["setOracle", "pause"],
  }),
];
const S = (...xs: [Step[0], string][]) => xs as Step[];
const seq: Record<string, Step[]> = {
  deposit: S(
    ["r", "paused"],
    ["r", "totalShares"],
    ["r", "oracle"],
    ["r", "asset"],
    ["c", "c_oracle_getPrice"],
    ["r", "asset"],
    ["c", "c_asset_transferFrom"],
    ["w", "shares"],
    ["w", "totalShares"],
    ["e", "evDeposit"],
  ),
  withdraw: S(
    ["r", "paused"],
    ["r", "shares"],
    ["r", "oracle"],
    ["r", "asset"],
    ["c", "c_oracle_getPrice"],
    ["r", "asset"],
    ["c", "c_asset_transfer"],
    ["w", "shares"],
    ["w", "totalShares"],
    ["e", "evWithdraw"],
  ),
  harvest: S(
    ["r", "asset"],
    ["c", "c_asset_balanceOf"],
    ["r", "asset"],
    ["r", "strategy"],
    ["c", "c_asset_transfer"],
    ["r", "strategy"],
    ["c", "c_strategy_invest"],
    ["r", "feeBps"],
    ["r", "owner"],
    ["w", "shares"],
    ["w", "totalShares"],
  ),
  harvestRewards: S(["r", "keeper"]),
  setOracle: S(["r", "owner"], ["w", "oracle"]),
  pause: S(["r", "keeper"], ["w", "paused"]),
};
const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
const lineOf = (p: Piece) => p.line ?? Math.max(0, at(p.find));
const data = {
  pieces,
  seq,
  internal: ["ctor", "_computeShares", "_price", "_accrueFee"],
};
const m: LabModel = {
  ...data,
  byId,
  lines,
  lineOf,
  contract: "LuoraVault",
  file: "src/LuoraVault.sol",
  entry: [
    "deposit",
    "withdraw",
    "harvest",
    "harvestRewards",
    "setOracle",
    "pause",
  ],
  findings: pieces.filter((p) => p.sys === "vulns"),
  lesion: { f1: "deposit", f6: "setOracle" },
  callTarget: Object.fromEntries(
    pieces
      .filter((p) => p.sys === "calls")
      .map((p) => [p.id, p.links?.[0] as string]),
  ),
  coverage: undefined,
  stepLines: (f: string) => resolveStepLines(data, lines, lineOf, f),
};

// ---- contract graph ------------------------------------------------------------------
const g = contractGraph(m);
assert.equal(g.nodes.filter((n) => n.kind === "entry").length, 6);
assert.equal(g.nodes.filter((n) => n.kind === "slot").length, 11);
assert.equal(g.nodes.filter((n) => n.kind === "ext").length, 4);
assert.equal(g.nodes.filter((n) => n.kind === "event").length, 2);
const setOracle = g.nodes.find((n) => n.id === "setOracle");
assert.deepEqual(
  setOracle?.inputs.map((p) => [p.label, p.type]),
  [
    ["caller · owner", "actor"],
    ["newOracle : IOracle", "actor"],
  ],
);
assert.deepEqual(
  setOracle?.outputs.map((p) => p.id),
  ["w:oracle", "r:!owner"],
);
assert.ok(
  setOracle?.badges?.some((b) => b.label === "▲2 H" || b.label.startsWith("▲")),
);
assert.ok(
  g.wires.some((w) => w.from.node === "setOracle" && w.to.node === "oracle"),
);
assert.ok(
  g.wires.some(
    (w) =>
      w.from.port === "c:c_asset_transferFrom" && w.to.node === "dep_IERC20",
  ),
);
assert.ok(
  g.wires.some(
    (w) => w.from.port === "e:evDeposit" && w.to.node === "evDeposit",
  ),
);
// cards in a column never overlap
for (const kind of ["entry", "slot"] as const) {
  const col = g.nodes.filter((n) => n.kind === kind).sort((a, b) => a.y - b.y);
  for (const [i, n] of col.slice(1).entries())
    assert.ok(n.y >= col[i].y + nodeHeight(col[i]) + GAP, `${n.id} too close`);
}
// every slot sits in the slots column; columns leave ≥160px for the wires to curve
assert.ok(
  g.nodes.filter((n) => n.kind === "slot").every((n) => n.x === COL.slot),
);
const right = (k: string) =>
  Math.max(...g.nodes.filter((n) => n.kind === k).map((n) => n.x + n.w));
assert.ok(COL.slot - right("entry") >= 160);
assert.ok(COL.side - right("slot") >= 160);
// targets sit near the functions that write them
const ys = Object.fromEntries(g.nodes.map((n) => [n.id, n.y]));
assert.ok(ys.shares < ys.oracle, "deposit/withdraw slots above setOracle's");
assert.equal(portPos(setOracle as never, "then", "in").x, 0);

// ---- reverts --------------------------------------------------------------------------
assert.deepEqual(
  revertsOf(m, "deposit").map((r) => [r.reason, r.cond, r.via]),
  [["paused", "!paused", "whenNotPaused"]],
);
assert.deepEqual(
  revertsOf(m, "withdraw").map((r) => r.reason),
  ["paused", "!shares"],
);
assert.deepEqual(
  revertsOf(m, "harvestRewards").map((r) => r.reason),
  ["!keeper", "approve"],
);

// ---- wiring rules ---------------------------------------------------------------------
const tpl = templates(m);
assert.deepEqual(
  tpl.map((t) => t.name),
  [
    "Non-owner cannot setOracle",
    "Deposit then withdraw returns funds",
    "Pause blocks deposit",
    "Shares accounting holds after deposits by two users",
  ],
);
const dw = tpl[1].build();
const cards = dw.nodes.map((n) => scenarioCard(m, n));
const W = (a: string, ap: string, b: string, bp: string): Wire => ({
  from: { node: a, port: ap },
  to: { node: b, port: bp },
});
assert.equal(
  wireError(cards, dw.wires, W("alice", "addr", "dep", "a0")),
  "actor → amount",
);
assert.equal(wireError(cards, dw.wires, W("amt", "value", "dep", "a0")), null);
assert.equal(
  wireError(cards, dw.wires, W("same", "then", "before", "then")),
  "loop",
);
assert.equal(
  wireError(cards, dw.wires, W("dep", "then", "dep", "then")),
  "same card",
);
assert.equal(
  wireError(cards, dw.wires, W("dep", "r:paused", "same", "a")),
  "revert → amount",
);
const re = connect(dw.wires, W("amt", "value", "wd", "a0"));
assert.equal(
  re.filter((w) => w.to.node === "wd" && w.to.port === "a0").length,
  1,
);
assert.equal(
  re.find((w) => w.to.node === "wd" && w.to.port === "a0")?.from.node,
  "amt",
);

assert.deepEqual(scenarioOrder(dw), [
  "before",
  "dep",
  "held",
  "wd",
  "after",
  "same",
]);
assert.ok(
  assertOptions(m).some((o) => o.label === "totalShares == Σ shares[actor]"),
);
assert.ok(
  assertOptions(m).some((o) => o.label === "only owner can call setOracle"),
);
assert.ok(assertOptions(m).some((o) => o.label === "paused blocks withdraw"));

// ---- symbolic run ---------------------------------------------------------------------
const trace = (
  fn: string,
  args: string,
  caller: string,
  events: string[],
): TraceCall => ({
  test: "test_x",
  fn,
  args,
  ret: "",
  ok: true,
  caller,
  events,
  calls: [],
  transfers: [],
});
const calls = [
  trace("deposit", "amount=1000000000", "alice", [
    "Deposit(user=alice, assets=1000000000, shares=1000000000)",
  ]),
  trace("deposit", "amount=20000000000", "bob", [
    "Deposit(user=bob, assets=20000000000, shares=20000000000)",
  ]),
  trace("withdraw", "shareAmount=1000000000", "alice", [
    "Withdraw(user=alice, assets=1000000000, shares=1000000000)",
  ]),
];

const no = runScenario(m, tpl[0].build());
assert.equal(no.runs.call.status, "revert");
assert.match(
  no.runs.call.head,
  /^REVERT · onlyOwner \(require msg\.sender == owner\)/,
);
assert.equal(no.runs.call.line, at('require(msg.sender == owner, "!owner")'));
assert.equal(no.runs.expect.status, "pass");
assert.equal(no.runs.only.status, "pass");
assert.equal(no.findings.length, 0);

// without a forge trace the round trip stays symbolic: never a made-up number
const sym = runScenario(m, dw);
assert.equal(sym.runs.dep.status, "pass");
assert.ok(
  sym.runs.dep.lines.includes("alice −1,000 USDC"),
  sym.runs.dep.lines.join("|"),
);
assert.ok(
  sym.runs.dep.lines.includes("shares[alice] = minted₂"),
  sym.runs.dep.lines.join("|"),
);
assert.ok(sym.runs.dep.findings?.includes("f1"));
assert.equal(sym.runs.held.head, "shares[alice] = minted₂");
assert.equal(sym.runs.wd.status, "pass", sym.runs.wd.head);
assert.equal(sym.runs.same.status, "unknown");
assert.equal(sym.runs.before.head, "asset.balanceOf(alice) = 5,000 USDC");
// with the trace the same scenario resolves to real values and holds
const real = runScenario(m, dw, calls);
assert.equal(real.runs.held.head, "shares[alice] = 1,000,000,000");
assert.equal(real.runs.after.head, "asset.balanceOf(alice) = 5,000 USDC");
assert.equal(real.runs.same.status, "pass");

const pz = runScenario(m, tpl[2].build());
assert.equal(pz.runs.pause.status, "pass");
assert.equal(pz.runs.dep.status, "revert");
assert.equal(pz.runs.dep.reason, "paused");
assert.equal(pz.runs.expect.status, "pass");
assert.equal(pz.runs.blocks.status, "pass");

const two = tpl[3].build();
const s1 = runScenario(m, two);
assert.equal(s1.runs.sum.status, "pass", s1.runs.sum.head); // minted₁ + minted₂ on both sides
assert.equal(s1.runs.solvent.status, "unknown");
const s2 = runScenario(m, two, calls);
assert.equal(s2.runs.sum.status, "pass");
assert.equal(s2.runs.solvent.status, "pass", s2.runs.solvent.head);

// a broken expectation is a finding with a fix
const bad: Scenario = {
  ...tpl[0].build(),
  nodes: tpl[0]
    .build()
    .nodes.map((n) => (n.kind === "actor" ? { ...n, role: "owner" } : n)),
};
const b = runScenario(m, bad);
assert.equal(b.runs.call.status, "pass");
assert.equal(b.runs.expect.status, "fail");
assert.equal(b.findings.length, 1);
assert.match(b.findings[0].fix, /setOracle should revert with "!owner"/);
const cmp: Scenario = {
  id: "x",
  name: "x",
  nodes: [
    { id: "a", x: 0, y: 0, kind: "const", value: "100" },
    { id: "b", x: 0, y: 100, kind: "const", value: "200" },
    {
      id: "eq",
      x: 300,
      y: 0,
      kind: "assert",
      check: { type: "cmp", op: "==" },
    },
  ],
  wires: [W("a", "value", "eq", "a"), W("b", "value", "eq", "b")],
};
const c = runScenario(m, cmp);
assert.equal(c.runs.eq.status, "fail");
assert.equal(c.findings[0].title, "Assert a == b failed");
// a withdraw of more shares than held reverts on the !shares require
const over: Scenario = {
  ...dw,
  wires: connect(dw.wires, W("amt", "value", "wd", "a0")).map((w) =>
    w.from.node === "amt" && w.to.node === "dep"
      ? W("amt", "value", "dep", "a0")
      : w,
  ),
  nodes: dw.nodes.map((n) => (n.id === "amt" ? { ...n, value: "1,000" } : n)),
};
over.nodes.push({ id: "more", x: 0, y: 600, kind: "const", value: "2,000" });
const ov = runScenario(
  m,
  { ...over, wires: connect(over.wires, W("more", "value", "wd", "a0")) },
  calls,
);
assert.equal(ov.runs.wd.status, "revert", ov.runs.wd.head);
assert.equal(ov.runs.wd.reason, "!shares");

// ---- foundry export -------------------------------------------------------------------
assert.equal(solAmount(5_000_000_000n), "5_000e6");
assert.equal(solAmount(123n), "123");
const t0 = foundryTest(m, tpl[0].build());
assert.equal(t0.file, "ScenarioNonOwnerCannotSetOracle.t.sol");
for (const s of [
  'import {LuoraVault, IERC20, IOracle, IStrategy, IUniswapV2Router02} from "../../src/LuoraVault.sol";',
  'import {MockOracle, MockStrategy, MockUSDC, MockUniswapRouter} from "../../src/mocks/Mocks.sol";',
  'address alice = makeAddr("alice");',
  "address oracle_ = address(new MockOracle());",
  'vault = new LuoraVault(IERC20(address(usdc)), IOracle(oracle_), IStrategy(strategy_), makeAddr("keeper"), IUniswapV2Router02(router_), IERC20(rewardToken_));',
  "usdc.mint(alice, 1_000e6);",
  'vm.prank(alice);\n        vm.expectRevert(bytes("!owner"));\n        vault.setOracle(IOracle(address(0)));',
  'vm.prank(makeAddr("not_owner"));',
])
  assert.ok(t0.source.includes(s), `missing: ${s}\n${t0.source}`);
const t1 = foundryTest(m, dw);
for (const s of [
  "uint256 snap_before = usdc.balanceOf(alice);",
  "vault.deposit(1_000e6);",
  "uint256 snap_held = vault.shares(alice);",
  "vault.withdraw(snap_held);",
  'assertEq(snap_after, snap_before, "a == b");',
])
  assert.ok(t1.source.includes(s), `missing: ${s}\n${t1.source}`);
const t2 = foundryTest(m, tpl[2].build());
assert.ok(
  t2.source.includes(
    "vault = new LuoraVault(IERC20(address(usdc)), IOracle(oracle_), IStrategy(strategy_), keeper, ",
  ),
);
assert.ok(t2.source.includes('assertTrue(vault.paused(), "paused here");'));
const t3 = foundryTest(m, two);
assert.ok(
  t3.source.includes(
    'assertEq(vault.totalShares(), vault.shares(alice) + vault.shares(bob) + vault.shares(vault.owner()), "totalShares == sum of shares");',
  ),
);
assert.ok(
  t3.source.includes(
    'assertGe(usdc.balanceOf(address(vault)), vault.totalShares(), "vault holds at least totalShares");',
  ),
);

console.log("lab ok");
