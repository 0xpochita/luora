// node --experimental-strip-types src/features/atlas/utils/map-layout.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import type { AtlasData, Piece, Step } from "../types.ts";
import { type Box, immutablesOf, mapLayout } from "./map-layout.ts";

// The fixtures use extensionless imports (bundler style); resolve them to .ts for node.
register(
  "data:text/javascript,export async function resolve(s,c,n){try{return await n(s,c)}catch(e){if(s.startsWith('.'))return n(s+'.ts',c);throw e}}",
);
const { SAMPLE_ATLAS } = await import("../fixtures/sample-atlas.ts");

const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

type Seg = { x1: number; y1: number; x2: number; y2: number };
const segs = (d: string): Seg[] => {
  const out: Seg[] = [];
  let x = 0;
  let y = 0;
  for (const [, c, v] of d.matchAll(/([MHV])(-?\d+(?: -?\d+)?)/g)) {
    const n = v.split(" ").map(Number);
    if (c === "M") [x, y] = n;
    else {
      const [nx, ny] = c === "H" ? [n[0], y] : [x, n[0]];
      out.push({ x1: x, y1: y, x2: nx, y2: ny });
      [x, y] = [nx, ny];
    }
  }
  return out;
};
const lo = (a: number, b: number) => Math.min(a, b);
const hi = (a: number, b: number) => Math.max(a, b);
/** A horizontal and a vertical segment cross strictly inside both. */
const cross = (h: Seg, v: Seg) =>
  h.y1 === h.y2 &&
  v.x1 === v.x2 &&
  v.x1 > lo(h.x1, h.x2) &&
  v.x1 < hi(h.x1, h.x2) &&
  h.y1 > lo(v.y1, v.y2) &&
  h.y1 < hi(v.y1, v.y2);
/** Segment passes through the inside of a box. */
const through = (s: Seg, b: Box) =>
  overlap(
    {
      x: lo(s.x1, s.x2),
      y: lo(s.y1, s.y2),
      w: Math.abs(s.x2 - s.x1) || 0.01,
      h: Math.abs(s.y2 - s.y1) || 0.01,
    },
    { x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 },
  );

function check(name: string, data: AtlasData) {
  const L = mapLayout(data);
  assert.deepEqual(mapLayout(data), L, `${name}: deterministic`);
  const json = JSON.stringify(L);
  for (const m of json.matchAll(/"(x|y|w|h)":(-?[\d.]+)/g))
    assert.ok(Number.isInteger(+m[2]), `${name}: whole pixel ${m[0]}`);
  for (const d of L.wires.map((w) => w.d).concat(L.trunk))
    assert.ok(!/\./.test(d), `${name}: whole pixel path ${d}`);
  const boxes: [string, Box][] = [
    ["hub", L.hub],
    ["deploy", L.deploy],
    ...L.panels.map((p): [string, Box] => [p.key, p]),
  ];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      assert.ok(
        !overlap(boxes[i][1], boxes[j][1]),
        `${name}: ${boxes[i][0]} overlaps ${boxes[j][0]}`,
      );
  for (const [k, b] of boxes)
    assert.ok(
      b.x >= 0 && b.y >= 0 && b.x + b.w <= L.w && b.y + b.h <= L.h,
      `${name}: ${k} inside canvas`,
    );
  for (const p of L.panels) {
    for (const n of p.nodes)
      assert.ok(
        n.x >= 0 && n.y >= 0 && n.x + n.w <= p.w && n.y + n.h <= p.h,
        `${name}: ${p.key}/${n.id} inside panel`,
      );
    for (let i = 0; i < p.nodes.length; i++)
      for (let j = i + 1; j < p.nodes.length; j++)
        assert.ok(
          !overlap(p.nodes[i], p.nodes[j]),
          `${name}: ${p.key} nodes overlap`,
        );
  }
  const ws = L.wires.map((w) => ({ key: w.key, s: segs(w.d) }));
  for (const a of ws) {
    for (const b of ws)
      if (a !== b)
        for (const s of a.s)
          for (const t of b.s)
            assert.ok(!cross(s, t), `${name}: wire ${a.key} crosses ${b.key}`);
    for (const [k, box] of boxes)
      if (k !== a.key)
        for (const s of a.s.slice(1))
          assert.ok(
            !through(s, box),
            `${name}: wire ${a.key} runs through ${k}`,
          );
  }
  assert.equal(
    L.ports.filter((p) => p.side !== "bottom").length,
    data.entry.length,
    `${name}: one port per entry`,
  );
  return L;
}

// sample fixture: CEI break in withdraw → its write after the call is late (red)
const s = check("sample", SAMPLE_ATLAS);
const wd = s.panels.find((p) => p.key === "withdraw");
assert.ok(wd?.nodes.some((n) => n.kind === "w" && n.late));
assert.ok(
  !s.panels.find((p) => p.key === "setOracle")?.nodes.some((n) => n.late),
);
assert.equal(s.panels.find((p) => p.key === "setOracle")?.cat, "admin");
assert.ok(wd?.findings.includes("f1"));
assert.ok(
  s.panels
    .find((p) => p.key === "harvestRewards")
    ?.nodes.some((n) => n.logo === "/logos/uniswap.png"),
);
assert.deepEqual(
  immutablesOf(
    "  address public immutable asset;\n  uint256 immutable private fee = 1;\n uint x;",
  ),
  ["asset", "fee"],
);

// real export, when present
const real = process.env.LUORA_DATA_PATH;
if (real) check("export", JSON.parse(readFileSync(real, "utf8")).atlas);

// a large synthetic contract: many entry points, long flows, no coverage
const big: Piece[] = [];
const seq: Record<string, Step[]> = {};
for (let i = 0; i < 30; i++)
  big.push({
    id: `s${i}`,
    sys: "storage",
    slot: i,
    name: `slot ${i} · v${i}`,
    find: "",
    desc: "",
  });
for (let i = 0; i < 6; i++)
  big.push({
    id: `c${i}`,
    sys: "calls",
    name: `t.m${i}`,
    target: "t",
    member: `m${i}`,
    find: "",
    desc: "",
  });
for (let i = 0; i < 17; i++) {
  big.push({
    id: `e${i}`,
    sys: "entry",
    name: `fn${i}()`,
    caller: i % 3 ? "anyone" : "owner",
    find: "",
    desc: "",
  });
  seq[`e${i}`] = Array.from(
    { length: (i * 7) % 19 },
    (_, k): Step => [
      (["r", "c", "w", "r"] as const)[k % 4],
      k % 4 === 1 ? `c${k % 6}` : `s${(i + k) % 30}`,
    ],
  );
}
check("big", {
  contract: "Big",
  file: "Big.sol",
  compiler: "0.8.0",
  source: "",
  pieces: big,
  lesion: {},
  seq,
  callTarget: {},
  banks: [],
  entry: big.filter((p) => p.sys === "entry").map((p) => p.id),
  internal: [],
});
check("empty", {
  contract: "E",
  file: "E.sol",
  compiler: "0.8.0",
  source: "",
  pieces: [],
  lesion: {},
  seq: {},
  callTarget: {},
  banks: [],
  entry: [],
  internal: [],
});
console.log("map-layout ok");
