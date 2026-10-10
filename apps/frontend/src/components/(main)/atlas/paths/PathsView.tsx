"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Chip, ENTER, PH, PhIcon } from "@/components/ui";
import type { AtlasModel, StepSim } from "@/features/atlas";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
import {
  type PathRow,
  pathOf,
  pathTree,
  type TreeKind,
  type TreeRow,
} from "@/features/atlas/utils/flow-layout";

/*
 * Paths, top to bottom (docs/ux/atlas.md, "Paths"). The old view drew every function as one long
 * horizontal lane; auditors read code downwards, and NN/g's eye-tracking puts 80% of attention on
 * the left half and almost none past the right edge. Now:
 *  - master | detail (as Trace's test list | trace): the functions on the left, one path at a time
 *  - rows as Phalcon Explorer's invocation flow writes them (the Trace's rows too): a
 *    "depth › TYPE" badge, indentation guides, fold boxes on modifiers and internal functions,
 *    the name inline with its source line, Show toggles for reads and view calls
 *  - every row carries its own source line, so the path reads like annotated code: checks where
 *    they can revert, external calls, writes after them (CEI), lines no test ran
 */

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** each step's type as an outlined word (Phalcon; colours as the Trace's KindBadge) */
const BADGE: Record<TreeKind, { title: string; badge: string }> = {
  ENTRY: {
    title: "The function called from outside",
    badge: "border-green/35 bg-green/[.08] text-green",
  },
  MODIFIER: {
    title: "A modifier: its checks run before the body",
    badge: "border-blue/35 bg-blue/[.08] text-blue",
  },
  INTERNAL: {
    title: "An internal function the path runs through",
    badge: "border-white/20 bg-white/[.04] text-body",
  },
  SLOAD: {
    title: "Reads a storage slot",
    badge: "border-white/15 bg-transparent text-muted",
  },
  SSTORE: {
    title: "Writes a storage slot",
    badge: "border-white/35 bg-white/[.07] text-fg",
  },
  CALL: {
    title: "Calls another contract; its code runs outside this one",
    badge: "border-green/35 bg-green/[.08] text-green",
  },
  STATICCALL: {
    title: "A read-only call to another contract",
    badge: "border-yellow/35 bg-yellow/[.08] text-yellow",
  },
  EMIT: {
    title: "Emits an event",
    badge: "border-cyan/35 bg-cyan/[.08] text-cyan",
  },
  REQUIRE: {
    title: "A check: the call reverts here when it fails",
    badge: "border-red/45 bg-red/[.1] text-red",
  },
  RETURN: {
    title: "The function returns",
    badge: "border-white/15 bg-transparent text-dim",
  },
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
  const tree = useMemo(() => (id ? pathTree(model, id) : null), [model, id]);
  // Phalcon's show / hide toggles and fold boxes
  const [hidden, setHidden] = useState<Set<TreeKind>>(new Set());
  const [folded, setFolded] = useState<Set<string>>(new Set());
  // rows keep their number when others hide or fold (Phalcon), so #7 always means one step
  const shown: (TreeRow & { n: number })[] = [];
  let below = Number.POSITIVE_INFINITY;
  for (const [n, r] of (tree?.rows ?? []).entries()) {
    if (r.depth > below) continue;
    below = folded.has(r.key) ? r.depth : Number.POSITIVE_INFINITY;
    if (!hidden.has(r.kind)) shown.push({ ...r, n });
  }
  const fn = id ? model.byId[id] : null;

  const caller = (x: string) => model.byId[x]?.caller ?? "anyone";
  const findingsOf = (x: string) => pathOf(model, x)?.findings.length ?? 0;
  const cov = id ? pieceCoverage(model, id) : null;
  const rows = path?.rows ?? [];
  const count = (k: PathRow["kind"]) => rows.filter((r) => r.kind === k).length;
  const cei = rows.filter((r) => "late" in r && r.late).length;

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

            {/* Phalcon's toolbar: what the flow shows, each a checkbox with its count */}
            <div className="flex flex-none items-center gap-2 px-5 pt-3">
              <span className="hdr-pill split sm">
                <span className="text-dim">Show</span>
                {(
                  [
                    ["SLOAD", "Reads", "Storage reads (SLOAD)"],
                    [
                      "STATICCALL",
                      "View calls",
                      "Read-only calls (STATICCALL)",
                    ],
                  ] as const
                ).map(([k, label, title], n) => {
                  const on = !hidden.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      title={title}
                      onClick={() =>
                        setHidden((h) => {
                          const next = new Set(h);
                          if (next.has(k)) next.delete(k);
                          else next.add(k);
                          return next;
                        })
                      }
                      className={n === 0 ? "mid" : ""}
                    >
                      <PhIcon
                        d={on ? PH.boxOn : PH.boxOff}
                        className="size-[14px]"
                      />
                      {label}
                      <span className="font-mono text-[11px] text-dim">
                        {tree?.rows.filter((r) => r.kind === k).length ?? 0}
                      </span>
                    </button>
                  );
                })}
              </span>
              {folded.size > 0 && (
                <button
                  type="button"
                  onClick={() => setFolded(new Set())}
                  className="text-[12px] text-muted hover:text-fg"
                >
                  Unfold all
                </button>
              )}
              <span className="ml-auto flex items-center gap-2 pr-1 text-[12px] text-dim">
                <span className="w-10 text-right" title="The source line">
                  Line
                </span>
              </span>
            </div>

            {/* the invocation flow: one dense row per step, nested under the modifier or internal
                function it runs in (Phalcon: depth → TYPE badge, guides, fold boxes) */}
            <motion.ol
              key={fn.id}
              {...ENTER}
              className="min-h-0 flex-1 space-y-px overflow-y-auto px-5 pt-1.5 pb-3"
            >
              {shown.map((r) => {
                const now = r.step != null && r.step === sim.step;
                const shut = folded.has(r.key);
                const text = r.line != null ? code(r.line) : "";
                return (
                  <li
                    key={r.key}
                    className={`relative flex min-h-[32px] items-center gap-2 rounded-tile pr-2 pl-1 transition-colors ${now ? "bg-hover shadow-[inset_2px_0_0_var(--fg)]" : r.kind === "REQUIRE" ? "hover:bg-red/[.06]" : "hover:bg-raised"}`}
                  >
                    {/* the whole row selects: the piece in the inspector, the step in replay */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(r.id);
                        if (r.step != null) sim.seek(r.step);
                      }}
                      aria-label={`${r.kind} ${r.name}`}
                      className="absolute inset-0 rounded-tile outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                    />
                    <span className="pointer-events-none w-[22px] flex-none text-right font-mono text-[11px] text-muted tabular-nums">
                      {r.n}
                    </span>
                    <span
                      className="tree-guides pointer-events-none flex-none self-stretch"
                      style={{ width: r.depth * 20 }}
                    />
                    {r.group ? (
                      <button
                        type="button"
                        onClick={() =>
                          setFolded((f) => {
                            const next = new Set(f);
                            if (next.has(r.key)) next.delete(r.key);
                            else next.add(r.key);
                            return next;
                          })
                        }
                        aria-expanded={!shut}
                        aria-label={shut ? "Unfold" : "Fold"}
                        className="relative z-10 grid size-4 flex-none place-items-center rounded-[4px] border border-white/20 font-mono text-[11px] text-muted leading-none hover:border-white/40 hover:text-fg"
                      >
                        {shut ? "+" : "−"}
                      </button>
                    ) : (
                      <span className="w-4 flex-none" />
                    )}
                    <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-2.5 whitespace-nowrap py-1">
                      <span
                        title={BADGE[r.kind].title}
                        className={`inline-flex h-[22px] flex-none items-center justify-center rounded-[6px] border px-2 font-medium font-mono text-[10.5px] tracking-wide ${BADGE[r.kind].badge}`}
                      >
                        {r.depth} › {r.kind}
                      </span>
                      <span
                        className={`flex-none font-mono text-[12.5px] ${r.kind === "REQUIRE" ? "text-red" : "font-semibold text-fg"}`}
                      >
                        {r.kind === "REQUIRE"
                          ? `reverts "${r.reason}"`
                          : r.kind === "ENTRY"
                            ? `${model.contract}.${r.name}`
                            : r.name}
                      </span>
                      {text && r.kind !== "ENTRY" && !r.group && (
                        <span className="min-w-0 truncate font-mono text-[12px] text-muted">
                          {text}
                        </span>
                      )}
                      {r.late && (
                        <Chip tone="bad" dot>
                          after an external call
                        </Chip>
                      )}
                      {r.finding && (
                        <Chip tone="bad" dot>
                          finding
                        </Chip>
                      )}
                      {r.untested && <Chip>never run by a test</Chip>}
                      <span className="ml-auto w-10 flex-none pl-2 text-right font-mono text-[11.5px] text-muted tabular-nums">
                        {r.line != null && `L${r.line + 1}`}
                      </span>
                    </span>
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
