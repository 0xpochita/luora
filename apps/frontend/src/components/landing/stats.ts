import "server-only";
import { readFile } from "node:fs/promises";
import { cacheLife } from "next/cache";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "@/features/atlas/fixtures/sample-atlas";
import type { AtlasData } from "@/features/atlas/types";
import { reportsOf } from "@/features/atlas/utils/findings";
import sample from "@/features/trace/fixtures/sample-trace.json";
import type { LuoraData } from "@/features/trace/types";

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
  let data: LuoraData & { atlas?: AtlasData };
  try {
    data = JSON.parse(await readFile(LUORA_DATA_PATH, "utf8"));
  } catch {
    data = { ...(sample as LuoraData), atlas: SAMPLE_ATLAS };
  }
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

export type RanCell = "src" | "ext" | "revert" | "plain";
export type PillarData = {
  /** one row per forge test, one cell per frame (capped) */
  ran: RanCell[][];
  frames: number;
  mapped: number;
  reverts: number;
  external: number;
  tests: number;
  /** coverage per function body, in contract order */
  fns: {
    name: string;
    lines: [number, number];
    branches: [number, number];
    calls: number;
  }[];
  lines: [number, number];
  branches: [number, number];
  functions: [number, number];
  untested: string[];
  /** findings by severity, highest first */
  findings: ("high" | "med" | "low" | "info")[];
  analyzers: string[];
  contract: string;
};

/** Everything the three dot-matrix panels draw, read from the same sample run as the stats. */
export async function pillarData(): Promise<PillarData> {
  "use cache";
  cacheLife("max");
  let data: LuoraData & { atlas?: AtlasData };
  try {
    data = JSON.parse(await readFile(LUORA_DATA_PATH, "utf8"));
  } catch {
    data = { ...(sample as LuoraData), atlas: SAMPLE_ATLAS };
  }
  const atlas = data.atlas ?? SAMPLE_ATLAS;
  const ran = data.tests.map((t) =>
    t.frames.slice(0, 22).map((f): RanCell => {
      if (!f.ok) return "revert";
      if (f.contract && f.contract !== atlas.contract) return "ext";
      return f.lines ? "src" : "plain";
    }),
  );
  const frames = data.tests.flatMap((t) => t.frames);
  const cov = atlas.coverage;
  const fns = atlas.pieces
    .filter(
      (p) => cov?.pieces[p.id] && (p.sys === "entry" || p.sys === "logic"),
    )
    .map((p) => {
      const c = cov?.pieces[p.id];
      return {
        name: p.name,
        lines: [c?.lines.hit ?? 0, c?.lines.found ?? 0] as [number, number],
        branches: [c?.branches.hit ?? 0, c?.branches.found ?? 0] as [
          number,
          number,
        ],
        calls: c?.calls ?? 0,
      };
    });
  const rank = { high: 0, med: 1, low: 2, info: 3 } as const;
  const findings = atlas.pieces
    .filter((p) => p.sys === "vulns")
    .map((p) => p.risk ?? "low")
    .sort((a, b) => rank[a] - rank[b]);
  const reports = atlas.pieces
    .filter((p) => p.sys === "vulns")
    .flatMap(reportsOf)
    .filter((r) => r.tool !== "manual");
  const pair = (c?: { hit: number; found: number }): [number, number] => [
    c?.hit ?? 0,
    c?.found ?? 0,
  ];
  return {
    ran,
    frames: frames.length,
    mapped: frames.filter((f) => f.lines).length,
    reverts: frames.filter((f) => !f.ok).length,
    external: frames.filter((f) => f.contract && f.contract !== atlas.contract)
      .length,
    tests: data.tests.length,
    fns,
    lines: pair(cov?.lines),
    branches: pair(cov?.branches),
    functions: pair(cov?.functions),
    untested: fns.filter((f) => f.lines[1] && !f.lines[0]).map((f) => f.name),
    findings,
    analyzers: [...new Set(reports.map((r) => r.tool))].sort().reverse(),
    contract: atlas.contract,
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
