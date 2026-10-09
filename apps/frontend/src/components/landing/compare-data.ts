import "server-only";
import { readFile } from "node:fs/promises";
import { cacheLife } from "next/cache";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "@/features/atlas/fixtures/sample-atlas";
import type { AtlasData } from "@/features/atlas/types";
import { pieceCoverage } from "@/features/atlas/utils/coverage";
import { SEVERITY_LABEL, titleOf } from "@/features/atlas/utils/findings";
import { createAtlasModel } from "@/features/atlas/utils/model";
import sample from "@/features/trace/fixtures/sample-trace.json";
import type { Frame, LuoraData } from "@/features/trace/types";
import { scenarioDemo, scenarioSol } from "./stats";

/*
 * Everything Compare's two worlds show, read from the sample run at build time: the same local
 * `luora-data.json` / bundled fixtures as stats.ts (its reader is private, so it is repeated here
 * instead of touching a file other passes are editing). Small plain data: the page carries it in
 * the RSC payload, the fragments are drawn on the client only near the screen.
 */

type Run = LuoraData & { atlas?: AtlasData };
async function readRun(): Promise<Run> {
  try {
    return JSON.parse(await readFile(LUORA_DATA_PATH, "utf8"));
  } catch {
    return { ...(sample as LuoraData), atlas: SAMPLE_ATLAS };
  }
}

export type CallRow = {
  d: number;
  kind: "call" | "static" | "event";
  name: string;
  args: string;
  at: string;
};
export type SrcLine = { n: number; code: string; ran: boolean; ops: string[] };
export type CompareData = {
  /** forge -vvvv's text tree of one call, and the same frames decoded (row 1) */
  tree: string[];
  calls: CallRow[];
  /** that call's source lines: which ran, which read or wrote storage (rows 2, 3) */
  frame: { file: string; head: string; gas: number; lines: SrcLine[] };
  /** the storage opcodes as forge's debugger steps through them (row 3) */
  ops: string[];
  /** who calls whom in the test (row 4) */
  graph: { test: string; nodes: string[][]; edges: [string, string][] };
  /** findings to triage, and the report's first line (row 6) */
  findings: { title: string; risk: string; label: string }[];
  contract: string;
  /** forge coverage's file totals, and the functions untested first (row 7) */
  cov: { file: string; lines: string; branches: string; funcs: string };
  fns: { name: string; pct: number }[];
  /** the Lab scenario and its exported test (row 8) */
  scenario: { title: string; ok: boolean }[];
  sol: { file: string; lines: string[] };
};

const pct = (c?: { hit: number; found: number }) =>
  c?.found
    ? `${((c.hit / c.found) * 100).toFixed(2)}% (${c.hit}/${c.found})`
    : "-";

/** "amount=1000000000" → forge's positional "1000000000" */
const positional = (args: string) =>
  args
    .split(", ")
    .map((a) => a.split("=").pop())
    .join(", ");

export async function compareData(): Promise<CompareData> {
  "use cache";
  cacheLife("max");
  const data = await readRun();
  const atlas = data.atlas ?? SAMPLE_ATLAS;
  const model = createAtlasModel(atlas);
  const t =
    data.tests.find((x) => x.name.startsWith("test_depositThenWithdraw")) ??
    data.tests[0];

  // the deposit that reads the oracle (as depositFrames in stats.ts): its call and every child
  const read = t.frames.findIndex((f) => f.kind === "STATICCALL" && f.d > 1);
  const at = Math.max(0, read - 1);
  const end = t.frames.findIndex((f, i) => i > at && f.d <= t.frames[at].d);
  const sub = t.frames.slice(at, end < 0 ? undefined : end);
  const top = sub[0];
  const base = top.d;
  const name = (f: Frame) => `${f.contract}::${f.fn}`;

  // forge's trace tree, built the way forge prints it: gas, Contract::fn(args), children, then
  // the return closing the call
  const tree: string[] = [];
  let i = 0;
  const walk = (pad: string) => {
    const f = sub[i++];
    if (f.kind === "EVENT") {
      tree.push(`${pad}├─ emit ${f.fn}(${f.args.replaceAll("=", ": ")})`);
      return;
    }
    tree.push(
      `${pad}├─ [${f.gas}] ${name(f)}(${positional(f.args)})${f.kind === "STATICCALL" ? " [staticcall]" : ""}`,
    );
    while (i < sub.length && sub[i].d > f.d) walk(`${pad}│   `);
    tree.push(
      `${pad}│   └─ ← [${f.status ?? "Return"}]${f.ret ? ` ${f.ret}` : ""}`,
    );
  };
  walk("");

  const calls: CallRow[] = sub.map((f) => ({
    d: f.d - base,
    kind:
      f.kind === "EVENT"
        ? "event"
        : f.kind === "STATICCALL"
          ? "static"
          : "call",
    name: f.kind === "EVENT" ? f.fn : `${f.contract}.${f.fn}`,
    args: f.args,
    at: f.callSite ? `L${f.callSite.line}` : "",
  }));

  // the call's own body: the function's lines in its file, lit where the frame ran them
  const file = top.file ?? "";
  const ran = top.lines?.[file] ?? [];
  const src = (data.sources?.[file] ?? "").split("\n");
  const head = src.findIndex((l) => l.includes(`function ${top.fn}(`));
  const close = src.findIndex((l, i) => i > head && /^\s{4}\}/.test(l));
  const ops = (top.storage ?? []).filter((s) => s.file === file);
  const lines: SrcLine[] =
    head < 0
      ? []
      : src.slice(head, close + 1).map((code, i) => {
          const n = head + i + 1;
          return {
            n,
            code: code.slice(4),
            ran: ran.includes(n),
            ops: ops.filter((s) => s.line === n).map((s) => s.op),
          };
        });

  // call graph of the whole test: who calls whom (cheatcodes left out), one node per function
  const edges = new Map<string, [string, string]>();
  const stack: string[] = [];
  for (const f of t.frames) {
    if (f.kind === "EVENT" || f.contract === "vm") continue;
    const me = f.d === 0 ? t.name.replace("()", "") : `${f.contract}.${f.fn}`;
    stack[f.d] = me;
    const from = stack[f.d - 1];
    if (from) edges.set(`${from}>${me}`, [from, me]);
  }
  const depth = new Map<string, number>([[t.name.replace("()", ""), 0]]);
  for (const [a, b] of edges.values())
    if (!depth.has(b)) depth.set(b, (depth.get(a) ?? 0) + 1);
  const nodes: string[][] = [];
  for (const [n, d] of depth) {
    nodes[d] ??= [];
    nodes[d].push(n);
  }

  const sev = { high: 0, med: 1, low: 2, info: 3 };
  const findings = [...model.findings]
    .sort((a, b) => sev[a.risk ?? "low"] - sev[b.risk ?? "low"])
    .slice(0, 3)
    .map((f) => ({
      title: titleOf(f),
      risk: f.risk ?? "low",
      label: SEVERITY_LABEL[f.risk ?? "low"],
    }));

  const c = atlas.coverage;
  const fns = atlas.entry
    .flatMap((id) => {
      const cv = pieceCoverage(atlas, id);
      return cv ? [{ name: model.byId[id]?.name ?? id, pct: cv.pct }] : [];
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 4);

  const [demo, sol] = await Promise.all([scenarioDemo(), scenarioSol()]);
  return {
    tree,
    calls,
    frame: {
      file,
      head: `${top.contract}.${top.fn}(${top.args})`,
      gas: top.gas ?? 0,
      lines,
    },
    ops: ops.map((s) => s.op),
    graph: { test: t.name, nodes, edges: [...edges.values()] },
    findings,
    contract: atlas.contract,
    cov: {
      file: atlas.file,
      lines: pct(c?.lines),
      branches: pct(c?.branches),
      funcs: pct(c?.functions),
    },
    fns,
    scenario: (demo?.nodes ?? []).map((n) => ({
      title: n.title,
      ok: demo?.runs[n.id]?.status !== "fail",
    })),
    sol: {
      file: sol?.file ?? "",
      lines: (sol?.lines ?? []).filter((l) => l.trim()).slice(-7, -2),
    },
  };
}
