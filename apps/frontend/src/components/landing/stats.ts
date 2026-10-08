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
