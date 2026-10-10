import "server-only";
import { readFile } from "node:fs/promises";
import { cacheLife } from "next/cache";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "@/features/atlas/fixtures/sample-atlas";
import type { AtlasData } from "@/features/atlas/types";
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
export type CompareData = {
  /** the test whose deposit call both sides show */
  test: string;
  /** forge -vvvv's text tree of one call, and the same frames decoded (traces) */
  tree: string[];
  calls: CallRow[];
  /** forge coverage's file totals, and the Lab scenario with its exported test (tests) */
  cov: { file: string; lines: string; branches: string; funcs: string };
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

  const c = atlas.coverage;
  const [demo, sol] = await Promise.all([scenarioDemo(), scenarioSol()]);
  return {
    test: t.name,
    tree,
    calls,
    cov: {
      file: atlas.file,
      lines: pct(c?.lines),
      branches: pct(c?.branches),
      funcs: pct(c?.functions),
    },
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
