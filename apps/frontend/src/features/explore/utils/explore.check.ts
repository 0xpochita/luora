// node --experimental-strip-types src/features/explore/utils/explore.check.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { Protocol } from "../types";
import { exploreAskPrompt, exploreSuggestions, targetLabel } from "./ask.ts";
import {
  githubUrl,
  laneLayout,
  MAP,
  mapLayout,
  sourceLabel,
  summarize,
} from "./protocol.ts";

const dir = new URL("../data/", import.meta.url);
const all: Protocol[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
assert.ok(all.length >= 4, "four protocols");

const OPEN = /^(MIT|(L|A)?GPL-|Apache-|BSD-|MPL-|ISC$|Unlicense$|CC0-)/;

for (const p of all) {
  const names = new Set([
    ...p.contracts.map((c) => c.name),
    ...p.externals.map((e) => e.name),
  ]);
  // provenance: every repo pinned to a full commit
  for (const r of p.repos) assert.match(r.commit, /^[0-9a-f]{40}$/, r.id);

  // licences: source kept exactly for open SPDX ids, never for BUSL
  for (const c of p.contracts) {
    assert.equal(c.excerpts, OPEN.test(c.license ?? ""), `${p.id} ${c.name}`);
    if (!c.excerpts)
      assert.equal(c.atlas.source, "", `${c.name} keeps no source`);
    // a piece inherited from another file follows that file's licence
    for (const x of c.atlas.pieces as ((typeof c.atlas.pieces)[number] & {
      license?: string;
    })[]) {
      const open = "file" in x ? OPEN.test(x.license ?? "") : c.excerpts;
      if (!open)
        assert.equal(x.find, x.name.replace(/\(\)$/, ""), `${c.name} ${x.id}`);
    }
    assert.ok(
      !c.atlas.pieces.some((x) => x.sys === "vulns"),
      "no heuristic findings",
    );
    assert.ok(githubUrl(p, c.repo, c.file, c.line)?.includes(c.file));
  }

  // edges and flows only name what is on the map
  for (const e of p.edges) {
    assert.ok(names.has(e.from), `${p.id} edge from ${e.from}`);
    assert.ok(names.has(e.to), `${p.id} edge to ${e.to}`);
  }
  for (const f of p.flows) {
    assert.ok(f.steps.length > 2 && f.checks.length > 0, f.id);
    for (const s of f.steps) {
      assert.ok(names.has(s.lane) || s.lane === f.actor, `${f.id} ${s.lane}`);
      if (s.fn && p.contracts.some((c) => c.name === s.lane))
        assert.ok(s.file && s.line != null, `${f.id} ${s.at} has a line`);
    }
    const L = laneLayout(f);
    assert.equal(L.lanes[0], f.actor);
    assert.equal(new Set(L.steps.map((s) => s.x)).size, f.steps.length);
    assert.ok(L.steps.every((s) => s.lane >= 0));
  }

  // map: cards in a column never overlap; every relation between mapped nodes has a wire
  const m = mapLayout(p);
  for (const a of m.nodes)
    for (const b of m.nodes)
      if (a !== b && a.col === b.col)
        assert.ok(a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} / ${b.id}`);
  const pairs = new Set(
    p.edges
      .filter((e) => e.kind !== "inherits")
      .map((e) => `${e.from}>${e.to}`),
  );
  assert.equal(m.wires.length, pairs.size, `${p.id} one wire per pair`);
  const tall = mapLayout(p, 640);
  assert.ok(
    tall.nodes.every((n) => n.y + n.h <= 640 || n.y === 0),
    "tall groups wrap",
  );
  assert.ok(
    m.w / m.h > 0.8 && m.w / m.h < 4,
    `${p.id} map shape ${m.w}x${m.h}`,
  );
  for (const w of m.wires) assert.ok(!/NaN|Infinity/.test(w.d), w.d);
  assert.ok(m.nodes.every((n) => n.x + MAP.w <= m.w && n.y + n.h <= m.h));

  // gallery
  const s = summarize(p);
  assert.equal(s.contracts, p.contracts.length);
  assert.equal(s.preview.nodes.length, p.contracts.length + p.externals.length);
  assert.equal(s.preview.wires.length, m.wires.length);
  assert.deepEqual(
    s.flowTitles,
    p.flows.map((f) => f.title),
  );
  assert.ok(
    ["Structure only", "Source excerpts"].includes(sourceLabel(s)) ||
      /^Source for \d+ of \d+$/.test(sourceLabel(s)),
  );

  // ask: context first, question last, no source code, every suggestion defensive
  const targets = [
    { kind: "protocol" as const },
    { kind: "flow" as const, flow: p.flows[0].id },
    { kind: "flow" as const, flow: p.flows[0].id, step: 1 },
    { kind: "contract" as const, name: p.contracts[0].name },
  ];
  for (const t of targets) {
    const q = exploreSuggestions(p, t)[0];
    const prompt = exploreAskPrompt(p, t, q);
    assert.match(prompt, /^<context>\nProtocol: /);
    assert.ok(prompt.endsWith(`</context>\n\n${q}`));
    assert.doesNotMatch(prompt, /pragma solidity|SPDX-License-Identifier/);
    assert.ok(targetLabel(p, t).startsWith(p.name));
    for (const x of exploreSuggestions(p, t))
      assert.doesNotMatch(x, /exploit|attack|drain|steal|hack/i);
  }
  assert.match(
    exploreAskPrompt(p, targets[2], "q"),
    /→ 2\. /,
    "the selected step is marked",
  );
}

console.log(`explore ok (${all.map((p) => p.id).join(", ")})`);
