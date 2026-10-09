import "server-only";
import { readFile } from "node:fs/promises";
import { cacheLife } from "next/cache";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "@/features/atlas/fixtures/sample-atlas";
import type { AtlasData } from "@/features/atlas/types";
import { reportsOf } from "@/features/atlas/utils/findings";
import { foundryTest } from "@/features/atlas/utils/lab-foundry";
import {
  type GNode,
  nodeHeight,
  type Wire,
} from "@/features/atlas/utils/lab-graph";
import {
  assertOptions,
  runScenario,
  type Status,
  scenarioCard,
  templates,
} from "@/features/atlas/utils/lab-scenario";
import { createAtlasModel } from "@/features/atlas/utils/model";
import sample from "@/features/trace/fixtures/sample-trace.json";
import type { Frame, LuoraData, TestResult } from "@/features/trace/types";

type Run = LuoraData & { atlas?: AtlasData };

/** The local `luora-data.json`, else the bundled fixtures the app itself falls back to. */
async function readRun(): Promise<Run> {
  try {
    return JSON.parse(await readFile(LUORA_DATA_PATH, "utf8"));
  } catch {
    return { ...(sample as LuoraData), atlas: SAMPLE_ATLAS };
  }
}

export type Stat = { value: string; label: string };
export type SampleRun = {
  stats: Stat[];
  /** what `node luora-export.mjs` printed for this run (same wording as the script) */
  log: string[];
  /** toolchain chips: forge, solc, analyzers */
  tools: string[];
  file: string;
};

/**
 * Real numbers from the sample vault run, read once at build time: the local `luora-data.json`
 * (`node luora-export.mjs` in foundry/), else the bundled fixtures the app itself falls back to.
 */
export async function sampleRun(): Promise<SampleRun> {
  "use cache";
  cacheLife("max");
  const data = await readRun();
  const atlas = data.atlas ?? SAMPLE_ATLAS;
  const findings = atlas.pieces.filter((p) => p.sys === "vulns");
  const reports = findings
    .flatMap(reportsOf)
    .filter((r) => r.tool !== "manual");
  const analyzers = [...new Set(reports.map((r) => r.tool))].sort().reverse();
  const frames = data.tests.flatMap((t) => t.frames);
  const mapped = frames.filter((f) => f.lines).length;
  const scenarios = data.tests.filter((t) =>
    t.suite.startsWith("Scenario"),
  ).length;
  const lines = atlas.coverage?.lines;
  const forge = data.forgeVersion.replace(/^forge Version: /, "forge ");

  const stats: Stat[] = [
    { value: String(frames.length), label: "trace frames decoded" },
    { value: String(mapped), label: "frames mapped to source lines" },
    { value: String(data.tests.length), label: "forge tests traced" },
  ];
  if (scenarios)
    stats.push({
      value: String(scenarios),
      label: "Lab scenarios run as forge tests",
    });
  stats.push(
    reports.length
      ? {
          value: String(findings.length),
          label: `findings merged from ${reports.length} analyzer reports`,
        }
      : { value: String(findings.length), label: "findings mapped to source" },
  );
  if (lines?.found)
    stats.push({
      value: `${Math.round((lines.hit / lines.found) * 100)}%`,
      label: `line coverage, ${lines.hit} of ${lines.found} lines`,
    });

  return {
    stats,
    log: [
      `luora: findings ${findings.length} (${analyzers.join(" + ") || "atlas checks only"})`,
      `luora: ${data.tests.length} tests, ${frames.length} frames (${mapped} with source lines) → luora-data.json`,
    ],
    tools: [
      forge,
      `solc ${atlas.compiler}`,
      ...analyzers.map((a) => `${a[0].toUpperCase()}${a.slice(1)} report`),
    ],
    file: atlas.file,
  };
}

/** The audited contract's atlas (local export, else the bundled sample), for the Ask demo. */
export async function demoAtlas(): Promise<AtlasData> {
  "use cache";
  cacheLife("max");
  try {
    const data = JSON.parse(await readFile(LUORA_DATA_PATH, "utf8"));
    return data.atlas ?? SAMPLE_ATLAS;
  } catch {
    return SAMPLE_ATLAS;
  }
}

/** The first decoded frames of one sample test (heavy per-line data dropped), for the Trace widget. */
export async function traceFrames(count = 5): Promise<{
  test: string;
  frames: Frame[];
}> {
  "use cache";
  cacheLife("max");
  const data = await readRun();
  const t =
    data.tests.find((x) => x.name.startsWith("test_depositThenWithdraw")) ??
    data.tests[0];
  return {
    test: t.name,
    frames: t.frames
      .slice(1, 1 + count)
      .map(({ lines: _l, storage: _s, ...f }) => f),
  };
}

/** Gas per call frame across every traced test, cheapest first (the hero's chart). */
export async function gasProfile(): Promise<{ fn: string; gas: number }[]> {
  "use cache";
  cacheLife("max");
  const data = await readRun();
  return data.tests
    .flatMap((t) => t.frames)
    .filter((f) => f.kind !== "EVENT" && f.gas != null && f.gas > 0)
    .map((f) => ({ fn: f.fn.replace(/\(.*$/, ""), gas: f.gas as number }))
    .sort((a, b) => a.gas - b.gas);
}

/**
 * The deposit that reads the oracle in test_depositThenWithdraw (its call, the oracle read, the
 * token transfer and both events), for the Trace word: frame rows and the call graph of that call.
 */
export async function depositFrames(): Promise<{
  test: string;
  frames: Frame[];
}> {
  "use cache";
  cacheLife("max");
  const data = await readRun();
  const t =
    data.tests.find((x) => x.name.startsWith("test_depositThenWithdraw")) ??
    data.tests[0];
  const read = t.frames.findIndex((f) => f.kind === "STATICCALL" && f.d > 1);
  const at = Math.max(0, read - 1);
  const end = t.frames.findIndex((f, i) => i > at && f.d <= t.frames[at].d);
  return {
    test: t.name,
    frames: t.frames
      .slice(at, end < 0 ? undefined : end)
      .map(({ lines: _l, storage: _s, ...f }) => f),
  };
}

/**
 * The .t.sol the Lab exports for the "Non-<role> cannot <fn>" scenario, setUp folded to one line
 * (the rest is the generated source as is), for the Test word.
 */
export async function scenarioSol(): Promise<{
  file: string;
  lines: string[];
} | null> {
  "use cache";
  cacheLife("max");
  const model = createAtlasModel(await demoAtlas());
  const sc = templates(model)
    .find((t) => t.name.startsWith("Non-"))
    ?.build();
  if (!sc) return null;
  const { file, source } = foundryTest(model, sc);
  const src = source.trimEnd().split("\n");
  const head = src.findIndex((l) => l.startsWith("contract "));
  const setUp = src.findIndex((l) => l.includes("function setUp()"));
  const test = src.findIndex((l) => l.includes("function test_scenario()"));
  if (head < 0 || setUp < 0 || test < 0) return { file, lines: src };
  return {
    file,
    lines: [
      ...src.slice(head, setUp),
      "    function setUp() public { … }",
      "",
      ...src.slice(test),
    ],
  };
}

export const LAB_W = 560;
export type LabDemo = {
  nodes: GNode[];
  wires: Wire[];
  runs: Record<string, { status: Status; head: string }>;
  /** the inline widgets (name / role / USDC, revert reason) per card */
  fields: Record<string, { label: string; value: string; select?: boolean }[]>;
};

/**
 * The app's own "Non-<role> cannot <fn>" Lab template (Actor → Call → Expect revert), run by
 * runScenario, laid out to fit LAB_W.
 */
export async function labDemo(): Promise<LabDemo | null> {
  "use cache";
  cacheLife("max");
  const model = createAtlasModel(await demoAtlas());
  const sc = templates(model)
    .find((t) => t.name.startsWith("Non-"))
    ?.build();
  const pick = (id: string) => sc?.nodes.find((n) => n.id === id);
  const a = pick("alice");
  const c = pick("call");
  const e = pick("expect");
  if (!sc || a?.kind !== "actor" || !c || e?.kind !== "expect") return null;
  const wires = sc.wires.filter((w) => w.to.node !== "only");
  // Actor top-left feeds the Call to its right; Expect revert hangs under the Call, so the
  // whole graph fits LAB_W at 1:1 (the revert wire loops down into Expect, as in the app)
  const actor = { ...scenarioCard(model, a), x: 0, y: 0, w: 200 };
  const call = { ...scenarioCard(model, c), x: 230, y: 40, w: LAB_W - 230 };
  const ex = {
    ...scenarioCard(model, e),
    x: 300,
    y: call.y + nodeHeight(call) + 48,
    w: LAB_W - 300,
  };
  const runs = runScenario(model, sc).runs;
  return {
    nodes: [actor, call, ex],
    wires,
    runs: Object.fromEntries(
      Object.entries(runs).map(([id, r]) => [
        id,
        { status: r.status, head: r.head },
      ]),
    ),
    fields: {
      alice: [
        { label: "name", value: a.label },
        { label: "role", value: a.role, select: true },
        { label: "USDC", value: a.balance },
      ],
      expect: [
        { label: "reason", value: e.reason || "from wire", select: true },
      ],
    },
  };
}

/** The forge tests of the sample run without their frames (TestList rows on the Run step). */
export async function testRows(): Promise<TestResult[]> {
  "use cache";
  cacheLife("max");
  const data = await readRun();
  return data.tests.map((t) => ({ ...t, frames: [], transfers: [] }));
}

/**
 * The whole "Non-<role> cannot <fn>" scenario as the Lab shows it (Actor → Call → Expect revert,
 * plus the Assert on the call's 'then' port), at the template's own positions, run by runScenario.
 */
export async function scenarioDemo(): Promise<LabDemo | null> {
  "use cache";
  cacheLife("max");
  const model = createAtlasModel(await demoAtlas());
  const sc = templates(model)
    .find((t) => t.name.startsWith("Non-"))
    ?.build();
  if (!sc) return null;
  const nodes = sc.nodes.map((n) => scenarioCard(model, n));
  const left = Math.min(...nodes.map((n) => n.x));
  const top = Math.min(...nodes.map((n) => n.y));
  const runs = runScenario(model, sc).runs;
  const options = assertOptions(model);
  const fields: LabDemo["fields"] = {};
  for (const n of sc.nodes) {
    if (n.kind === "actor")
      fields[n.id] = [
        { label: "name", value: n.label },
        { label: "role", value: n.role, select: true },
        { label: "USDC", value: n.balance },
      ];
    if (n.kind === "expect")
      fields[n.id] = [
        { label: "reason", value: n.reason || "from wire", select: true },
      ];
    if (n.kind === "assert")
      fields[n.id] = [
        {
          label: "check",
          value:
            options.find(
              (o) => JSON.stringify(o.check) === JSON.stringify(n.check),
            )?.label ?? n.check.type,
          select: true,
        },
      ];
  }
  return {
    nodes: nodes.map((n) => ({ ...n, x: n.x - left, y: n.y - top })),
    wires: sc.wires,
    runs: Object.fromEntries(
      Object.entries(runs).map(([id, r]) => [
        id,
        { status: r.status, head: r.head },
      ]),
    ),
    fields,
  };
}
