"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { Chip, ENTER, PH, PhIcon } from "@/components/ui";
import type { AtlasModel, StepSim } from "@/features/atlas";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
import { type PathRow, pathOf } from "@/features/atlas/utils/flow-layout";

/*
 * Paths, top to bottom (docs/ux/atlas.md, "Paths"). The old view drew every function as one long
 * horizontal lane; auditors read code downwards, and NN/g's eye-tracking puts 80% of attention on
 * the left half and almost none past the right edge. Now:
 *  - master | detail (as Trace's test list | trace): the functions on the left, one path at a time
 *  - P1 pin/2814818513185996 (vertical stepper): a word for each step on the left, a node on one
 *    vertical line, the detail on the right
 *  - each step carries its own source line, so the path reads like annotated code: checks where
 *    they can revert, external calls, writes after them (CEI), lines no test ran
 */

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const WORD: Record<PathRow["kind"], string> = {
  entry: "Entry",
  access: "Access",
  check: "Check",
  r: "Read",
  w: "Write",
  c: "Call",
  e: "Emit",
  ret: "Return",
};
/** node on the line: red = can revert, blue = leaves the contract, white = changes state */
const DOT: Record<PathRow["kind"], string> = {
  entry: "bg-fg",
  access: "bg-muted",
  check: "border border-red bg-canvas",
  r: "bg-dim",
  w: "bg-fg",
  c: "bg-blue",
  e: "bg-cyan",
  ret: "border border-muted bg-canvas",
};

export function PathsView({
  model,
  lane,
  onLane,
  sim,
  onSelect,
}: {
  model: AtlasModel;
  /** the function on screen; the first entry point when null */
  lane: string | null;
  onLane: (id: string) => void;
  sim: StepSim;
  onSelect: (id: string | null) => void;
}) {
  const id = lane ?? model.entry[0] ?? null;
  const path = useMemo(() => (id ? pathOf(model, id) : null), [model, id]);
  const fn = id ? model.byId[id] : null;

  const caller = (x: string) => model.byId[x]?.caller ?? "anyone";
  const findingsOf = (x: string) => pathOf(model, x)?.findings.length ?? 0;
  const cov = id ? pieceCoverage(model, id) : null;
  const rows = path?.rows ?? [];
  const count = (k: PathRow["kind"]) => rows.filter((r) => r.kind === k).length;
  const cei = rows.filter((r) => "late" in r && r.late).length;

  const title = (r: PathRow) => {
    if (r.kind === "check") return `reverts with "${r.reason}"`;
    if (r.kind === "entry") return path?.sig ?? fn?.name;
    if (r.kind === "ret") return "returns";
    if (r.kind === "access")
      return path?.gates.length
        ? path.gates.map((g) => model.byId[g]?.name ?? g).join(", ")
        : `open · ${caller(r.id)} can call`;
    return model.byId[r.id]?.name ?? r.id;
  };
  const code = (line?: number) =>
    line != null ? (model.lines[line] ?? "").trim() : "";

  return (
    <div className="flex h-full min-h-0 gap-3 px-3 pb-3">
      {/* the functions, one row each (the master list) */}
      <nav
        aria-label="Functions"
        className="flex w-[280px] flex-none flex-col overflow-hidden rounded-card border border-border bg-card-grad shadow-soft"
      >
        <p className="flex-none px-4 pt-3.5 pb-2 text-[13px] text-muted">
          Entry points{" "}
          <span className="font-mono text-dim">{model.entry.length}</span>
        </p>
        <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
          {model.entry.map((x) => {
            const p = model.byId[x];
            if (!p) return null;
            const c = pieceCoverage(model, x);
            const f = findingsOf(x);
            const on = x === id;
            return (
              <li key={x}>
                <button
                  type="button"
                  aria-current={on || undefined}
                  onClick={() => onLane(x)}
                  className={`flex w-full flex-col gap-0.5 rounded-tile px-2.5 py-2 text-left transition-colors ${on ? "bg-hover shadow-[inset_2px_0_0_var(--fg)]" : "hover:bg-raised"}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">
                      {p.name}
                    </span>
                    {f > 0 && (
                      <span className="flex-none font-mono text-[11.5px] text-red">
                        {f} {f > 1 ? "findings" : "finding"}
                      </span>
                    )}
                  </span>
                  <span className="text-[12px] text-muted">
                    {caller(x)}
                    {c && (
                      <span
                        className={
                          c.state === "untested"
                            ? "text-red"
                            : c.state === "covered"
                              ? "text-green"
                              : ""
                        }
                      >
                        {" "}
                        · tests {pctLabel(c.pct)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* one path, top to bottom (P1) */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card-grad shadow-soft">
        {path && fn ? (
          <>
            <header className="flex flex-none flex-wrap items-center gap-x-3 gap-y-2 border-border border-b px-5 pt-4 pb-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium font-mono text-[17px] text-fg">
                  {path.sig}
                </h2>
                <p className="mt-1 text-[12.5px] text-muted">
                  {caller(fn.id)} can call
                  {path.gates.length > 0 &&
                    ` · guarded by ${path.gates.map((g) => model.byId[g]?.name ?? g).join(", ")}`}
                  {cov && ` · tests cover ${pctLabel(cov.pct)}`}
                  {" · "}
                  {[
                    plural(count("check"), "check"),
                    plural(count("c"), "external call"),
                    plural(count("w"), "write"),
                  ].join(" · ")}
                  {cei > 0 && (
                    <span className="text-red">
                      {" "}
                      · {cei} after an external call
                    </span>
                  )}
                </p>
              </div>
              {/* replay: step through the path, the source follows in the inspector */}
              <div className="flex flex-none items-center gap-1.5">
                <span className="mr-1 font-mono text-[12px] text-dim">
                  {sim.step < 0
                    ? `${sim.steps.length} steps`
                    : `step ${sim.step + 1} / ${sim.steps.length}`}
                </span>
                <button
                  type="button"
                  className="hdr-pill sm"
                  onClick={sim.reset}
                  disabled={sim.step < 0}
                  aria-label="Back to the start"
                  title="Back to the start"
                >
                  <PhIcon d={PH.reset} className="size-[14px]" />
                </button>
                <button
                  type="button"
                  className="hdr-pill sm lit"
                  onClick={sim.playing ? sim.pause : sim.play}
                  title={sim.playing ? "Pause" : "Replay the path step by step"}
                >
                  {sim.playing ? "Pause" : "Replay"}
                </button>
                <button
                  type="button"
                  className="hdr-pill sm"
                  onClick={sim.next}
                  disabled={sim.step >= sim.steps.length - 1}
                  title="Next step"
                >
                  Next
                </button>
              </div>
            </header>

            <motion.ol
              key={fn.id}
              {...ENTER}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-3"
            >
              {rows.map((r, i) => {
                const now =
                  "step" in r && r.step != null && r.step === sim.step;
                const late = "late" in r && r.late;
                const untested = "untested" in r && r.untested;
                const finding = "finding" in r && r.finding;
                const line = r.line;
                const piece = model.byId[r.id];
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(r.kind === "check" ? fn.id : r.id);
                        if ("step" in r && r.step != null) sim.seek(r.step);
                      }}
                      className={`grid w-full grid-cols-[64px_20px_minmax(0,1fr)] items-start gap-x-3 rounded-tile px-2 text-left transition-colors ${now ? "bg-hover" : "hover:bg-raised"}`}
                    >
                      <span
                        className={`pt-2.5 text-right text-[12px] ${r.kind === "check" ? "text-red" : "text-muted"}`}
                      >
                        {WORD[r.kind]}
                      </span>
                      {/* the one vertical line, broken only above the first and below the last */}
                      <span className="relative flex h-full justify-center">
                        <span
                          className={`absolute w-px bg-border-strong ${i === 0 ? "top-4" : "top-0"} ${i === rows.length - 1 ? "h-4" : "bottom-0"}`}
                        />
                        <span
                          className={`relative mt-3 size-2.5 rounded-full ${DOT[r.kind]} ${late ? "ring-2 ring-red/60" : ""}`}
                        />
                      </span>
                      <span className="min-w-0 py-1.5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={`font-mono text-[13px] ${r.kind === "check" ? "text-red" : "text-fg"}`}
                          >
                            {title(r)}
                          </span>
                          {r.kind === "c" && (
                            <span className="text-[12px] text-dim">
                              {piece?.view
                                ? "read-only call"
                                : "runs outside this contract"}
                            </span>
                          )}
                          {late && (
                            <Chip tone="bad" dot>
                              after an external call
                            </Chip>
                          )}
                          {finding && (
                            <Chip tone="bad" dot>
                              finding
                            </Chip>
                          )}
                          {untested && <Chip>never run by a test</Chip>}
                        </span>
                        {line != null && (
                          <span className="mt-0.5 flex min-w-0 gap-2 font-mono text-[12px]">
                            <span className="flex-none text-dim">
                              L{line + 1}
                            </span>
                            <span className="truncate text-muted">
                              {code(line)}
                            </span>
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </motion.ol>

            {path.findings.length > 0 && (
              <footer className="flex-none border-border border-t px-5 py-3">
                <p className="mb-1.5 text-[12.5px] text-muted">
                  Findings on this path
                </p>
                <ul className="flex flex-col gap-0.5">
                  {path.findings.map((f) => (
                    <li key={f}>
                      <button
                        type="button"
                        onClick={() => onSelect(f)}
                        className="flex w-full items-center gap-2.5 rounded-tile px-2 py-1 text-left text-[13px] hover:bg-raised"
                      >
                        <span className="size-1.5 flex-none rounded-full bg-red" />
                        <span className="truncate text-body">
                          {model.byId[f]?.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </footer>
            )}
          </>
        ) : (
          <p className="m-auto text-[13px] text-dim">
            This contract has no entry points.
          </p>
        )}
      </section>
    </div>
  );
}
