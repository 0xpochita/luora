// node --experimental-strip-types src/features/atlas/utils/flow-layout.check.ts
import assert from "node:assert/strict";
import type { AtlasData, Piece, Step } from "../types.ts";
import {
  checkReason,
  FLOW,
  flowLayout,
  pathOf,
  signatureOf,
} from "./flow-layout.ts";
import { resolveStepLines } from "./step-lines.ts";

const source = `contract V {
    address public owner;
    mapping(address => uint256) public shares;
    bool public paused;
    event Withdraw(address user, uint256 v);
    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }
    constructor() {
        owner = msg.sender;
    }
    function withdraw(uint256 a) external whenNotPaused {
        require(shares[msg.sender] >= a, "!shares");
        (bool ok, ) = msg.sender.call{value: a}("");
        require(ok, "send failed");
        shares[msg.sender] -= a;
        emit Withdraw(msg.sender, a);
    }
    function setOwner(address o) external {
        if (msg.sender != owner) revert NotOwner();
        owner = o;
    }
}`;
const lines = source.split("\n");
const at = (s: string) => lines.findIndex((l) => l.includes(s));
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
  line: at(find),
  desc: "",
  ...x,
});
const pieces: Piece[] = [
  P("owner", "storage", "slot 0 · owner", "address public owner", { slot: 0 }),
  P("shares", "storage", "slot 1 · shares[]", "mapping(address", { slot: 1 }),
  P("paused", "storage", "slot 2 · paused", "bool public paused", { slot: 2 }),
  P("evW", "events", "Withdraw", "event Withdraw"),
  P("wnp", "access", "whenNotPaused", "modifier whenNotPaused", { n: 4 }),
  P("ctor", "logic", "constructor", "constructor(", { n: 3, links: ["owner"] }),
  P("withdraw", "entry", "withdraw()", "function withdraw", {
    n: 7,
    caller: "anyone",
  }),
  P("setOwner", "entry", "setOwner()", "function setOwner", {
    n: 4,
    caller: "owner",
  }),
  P("cCall", "calls", "msg.sender.call", "msg.sender.call", {
    target: "msg.sender",
    member: "call",
  }),
  P(
    "f1",
    "vulns",
    "F-01 State written after external call",
    "function withdraw",
    { risk: "high" },
  ),
  P("f2", "vulns", "F-02 Missing event", "function setOwner", { risk: "low" }),
];
const seq: Record<string, Step[]> = {
  withdraw: [
    ["r", "paused"],
    ["r", "shares"],
    ["c", "cCall"],
    ["w", "shares"],
    ["e", "evW"],
  ],
  setOwner: [
    ["r", "owner"],
    ["w", "owner"],
  ],
};
const data: AtlasData = {
  contract: "V",
  file: "V.sol",
  compiler: "0.8.20",
  source,
  pieces,
  lesion: { f1: "withdraw", f2: "setOwner" },
  seq,
  callTarget: {},
  banks: [],
  entry: ["withdraw", "setOwner"],
  internal: ["ctor"],
  coverage: {
    tool: "forge",
    lines: { hit: 1, found: 2 },
    branches: { hit: 0, found: 0 },
    functions: { hit: 1, found: 2 },
    hits: { [at("shares[msg.sender] -=")]: 0, [at("emit Withdraw")]: 3 },
    branchHits: {},
    pieces: {
      setOwner: { lines: { hit: 0, found: 2 }, branches: { hit: 0, found: 0 } },
    },
  },
};
const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
const lineOf = (p: Piece) => p.line ?? 0;
const model = {
  ...data,
  byId,
  lines,
  lineOf,
  findings: pieces.filter((p) => p.sys === "vulns"),
  stepLines: (fn: string) => resolveStepLines(data, lines, lineOf, fn),
  lateWrites: (fn: string) => {
    let called = false;
    return (seq[fn] ?? []).map(([k, t]) => {
      if (k === "c" && !byId[t]?.view) called = true;
      return k === "w" && called;
    });
  },
};

assert.equal(
  signatureOf(
    "function deposit(uint256 amount, bytes calldata d) external {",
    "x",
  ),
  "deposit(uint256,bytes)",
);
assert.equal(signatureOf("receive() external payable {}", "x"), "receive()");
assert.equal(checkReason('  require(ok, "send failed");'), "send failed");
assert.equal(checkReason("  if (x) revert NotOwner();"), "NotOwner");
assert.equal(checkReason("  require(a > b);"), "a > b");
assert.equal(checkReason("  // require(x)"), null);
assert.equal(checkReason("  x = 1;"), null);

const L = flowLayout(model);
assert.deepEqual(flowLayout(model), L, "deterministic");
const [w, s] = L.lanes;
assert.deepEqual(
  w.nodes.map((n) => n.kind),
  ["entry", "access", "r", "r", "c", "w", "e", "ret"],
);
assert.equal(w.sig, "withdraw(uint256)");
assert.deepEqual(w.gates, ["wnp"]);
assert.equal(w.nodes[1].id, "wnp", "access node selects the modifier");
assert.equal(w.nodes[5].late, true, "write after call is late");
assert.equal(w.nodes[5].untested, true, "0-hit line is untested");
assert.equal(w.nodes[6].untested, false);
// "paused" (modifier) hangs after the paused read, "!shares" after the read it checks, "send failed" after the call
assert.deepEqual(
  w.reverts.map((v) => v.reason),
  ["paused", "!shares", "send failed"],
);
assert.equal(w.reverts[0].stem, w.nodes[2].x + FLOW.dx / 2);
assert.equal(w.reverts[1].stem, w.nodes[3].x + FLOW.dx / 2);
assert.equal(w.reverts[2].stem, w.nodes[4].x + FLOW.dx / 2);
assert.deepEqual(
  w.findings.map((f) => f.id),
  ["f1"],
);
assert.equal(s.sig, "setOwner(address)");
assert.deepEqual(
  s.reverts.map((v) => v.reason),
  ["NotOwner"],
);
assert.ok(
  s.nodes.slice(2, -1).every((n) => n.untested),
  "lane never ran → all steps untested",
);
assert.deepEqual(L.deploy, {
  id: "ctor",
  x: FLOW.trunkX,
  y: L.deploy.y,
  writes: ["owner"],
});
assert.deepEqual(L.idle.roles, ["owner", "shares", "paused"]);
assert.deepEqual(
  L.events.map((e) => [e.id, e.lanes]),
  [["evW", ["withdraw"]]],
);
assert.deepEqual(
  L.findings.map((f) => f.id),
  ["f1", "f2"],
  "worst first",
);

// integer coordinates and no overlapping circles
const circles = [
  ...L.lanes.flatMap((l) => [
    ...l.nodes.map((n) => ({ ...n, r: FLOW.r })),
    ...l.reverts.map((v) => ({ ...v, r: FLOW.revertR })),
    ...l.findings.map((f) => ({ ...f, y: l.cy, r: FLOW.badge })),
  ]),
  ...L.events.map((e) => ({ ...e, r: FLOW.r })),
  ...L.findings.map((e) => ({ ...e, r: FLOW.r })),
];
for (const c of circles)
  assert.ok(Number.isInteger(c.x) && Number.isInteger(c.y));
for (let i = 0; i < circles.length; i++)
  for (let j = i + 1; j < circles.length; j++) {
    const a = circles[i];
    const b = circles[j];
    assert.ok(
      Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r,
      `overlap ${i} ${j}`,
    );
  }
// lanes stack without overlap, everything inside the canvas
for (let i = 1; i < L.lanes.length; i++)
  assert.ok(L.lanes[i].y >= L.lanes[i - 1].y + L.lanes[i - 1].h);
assert.ok(circles.every((c) => c.x + c.r <= L.w && c.y + c.r <= L.h));

// one function's path, top to bottom: entry, access, then steps with each check right after
// the step it follows (modifier check first, body check after the reads before it)
const path = pathOf(model, "withdraw");
assert.ok(path);
const kinds = path.rows.map((r) => (r.kind === "check" ? `check:${r.reason}` : r.kind));
assert.deepEqual(kinds.slice(0, 2), ["entry", "access"]);
assert.ok(kinds.includes("check:paused") && kinds.includes("check:!shares"), kinds.join(","));
assert.ok(kinds.indexOf("check:paused") < kinds.indexOf("c"), "the modifier check comes before the call");
assert.ok(kinds.indexOf("check:!shares") < kinds.indexOf("c"), "the body check comes before the call");
assert.equal(kinds.at(-1), "ret");
const late = path.rows.find((r) => r.kind === "w");
assert.ok(late && "late" in late && late.late, "the write after the call is flagged (CEI)");
assert.deepEqual(path.findings, ["f1"]);
assert.equal(pathOf(model, "nope"), null);

console.log("flow-layout ok");
