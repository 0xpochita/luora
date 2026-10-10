// node --experimental-strip-types src/features/explore/utils/explore.check.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { Protocol } from "../types";
import { exploreAskPrompt, exploreSuggestions, targetLabel } from "./ask.ts";
import { flowSequence, githubUrl, sourceLabel, summarize } from "./protocol.ts";

/** callers a flow names that are roles, not mapped contracts or the flow's actor */
const ROLES = new Set(["Anyone", "Allocator"]);

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
    // the sequence diagram: every step says who calls, and that caller is a party
    for (const st of f.steps)
      assert.ok(
        st.from &&
          (names.has(st.from) || st.from === f.actor || ROLES.has(st.from)),
        `${p.id}/${f.id} ${st.at}: caller ${st.from}`,
      );
    const q = flowSequence(p, f);
    assert.equal(q.parties[0].name, f.actor);
    const parties = new Set(q.parties.map((x) => x.name));
    assert.ok(
      q.steps.every((st) => parties.has(st.from) && parties.has(st.to)),
    );
  }

  // gallery
  const s = summarize(p);
  assert.equal(s.contracts, p.contracts.length);
  // gallery preview: the entry contract and real targets, at most five, the rest counted
  assert.equal(s.preview.hub, p.contracts[0].name);
  assert.ok(s.preview.out.length <= 5 && s.preview.out.length > 0, p.id);
  for (const o of s.preview.out)
    assert.ok(p.edges.some((e) => e.from === s.preview.hub && e.to === o.to));
  assert.equal(
    s.preview.out.length + s.preview.more,
    new Set(
      p.edges
        .filter((e) => e.from === s.preview.hub && e.kind !== "inherits")
        .map((e) => e.to),
    ).size,
  );
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
