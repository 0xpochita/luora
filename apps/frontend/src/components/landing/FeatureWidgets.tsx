"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CoverageSummary } from "@/components/(main)/atlas/CoverageSummary";
import { Chip, KindBadge, Meter, Panel, ToggleChip } from "@/components/ui";
import type { AtlasData, FindingTool, Risk } from "@/features/atlas/types";
import {
  flaggedLines,
  lineRanges,
  reportsOf,
  SEVERITIES,
  SEVERITY_LABEL,
  TOOL_LABEL,
  TOOLS,
  titleOf,
} from "@/features/atlas/utils/findings";
import { nodeHeight } from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { displayKind, type Frame, human, splitArgs } from "@/features/trace";
import { LabGraph } from "./LabGraph";
import type { LabDemo } from "./stats";
import { Window } from "./Window";

/*
 * Feature-row widgets. R21 (pin 489273947042736110): ONE focused product widget per feature, an
 * isolated card rather than a whole-app screenshot. R11 (pin 15270086238695547): each one is a
 * small, clean mini-UI with nothing cut off at its edges. R16: window chrome where it is a window.
 * All of them render the app's own components / utils on the same sample data the app falls back to.
 */

/** Trace: the first decoded frames of one test, in the app's row anatomy (TraceRow) without the clipped arg chips. */
export function TraceWidget({
  test,
  frames,
}: {
  test: string;
  frames: Frame[];
}) {
  const top = Math.min(...frames.map((f) => f.d));
  const maxGas = Math.max(1, ...frames.map((f) => f.gas ?? 0));
  return (
    <Window
      tab={test}
      aside="forge test -vvvv"
      className="w-full max-w-[560px]"
    >
      <ol className="@container p-2">
        {frames.map((f, i) => {
          const kind = displayKind(f);
          const [arg] = splitArgs(f.args);
          return (
            <li
              key={`${i}${f.fn}`}
              className="flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-tile py-1 pr-3 pl-1.5"
            >
              <span className="w-[18px] flex-none text-right font-mono text-[11px] text-dim">
                {i + 1}
              </span>
              <span
                className="tree-guides flex-none self-stretch"
                style={{ width: (f.d - top) * 18 }}
              />
              <KindBadge kind={kind} size="sm" />
              <span className="font-mono text-[13px]">
                <span className="text-muted">{f.to}</span>
                <span className="mx-px text-dim">.</span>
                <span className="font-medium text-fg">{f.fn}</span>
              </span>
              {f.ret ? (
                <span
                  className={`hidden rounded-chip bg-raised px-2 py-0.5 font-mono text-[11px] sm:inline ${f.ok ? "text-muted" : "text-red"}`}
                >
                  {f.ok ? `→ ${human(f.ret)}` : `✕ ${f.ret}`}
                </span>
              ) : (
                arg && (
                  <span className="hidden rounded-chip bg-raised px-1.5 py-0.5 font-mono text-[11px] text-fg sm:inline">
                    <em className="mr-1.5 text-dim not-italic">{arg[0]}</em>
                    {arg[1]}
                  </span>
                )
              )}
              <span className="ml-auto flex flex-none items-center gap-2 pl-3">
                {f.callSite && (
                  <span className="font-mono text-[11px] text-dim">
                    L{f.callSite.line}
                  </span>
                )}
                {f.gas != null && kind !== "EVENT" && (
                  <Meter
                    value={f.gas / maxGas}
                    className="hidden w-12 @[520px]:block"
                  />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Window>
  );
}

/** Lab: Actor → Call → Expect revert, laid out and run on the server (stats.ts `labDemo`), shrunk to fit. */
export function LabWidget({ nodes, wires, runs, fields }: LabDemo) {
  const W = Math.max(...nodes.map((n) => n.x + n.w));
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  // measured before the first paint: an unscaled first frame made the page jump (and re-measure
  // every ScrollTrigger) as it shrank
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setK(Math.min(1, el.clientWidth / W));
    const ro = new ResizeObserver(([e]) =>
      setK(Math.min(1, e.contentRect.width / W)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);
  const top = Math.min(...nodes.map((n) => n.y));
  const H = Math.max(...nodes.map((n) => n.y + nodeHeight(n))) - top;
  return (
    <div ref={box} className="w-full max-w-[560px]">
      <div className="relative mx-auto" style={{ width: W * k, height: H * k }}>
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: W, height: H, transform: `scale(${k})` }}
        >
          <LabGraph nodes={nodes} wires={wires} runs={runs} fields={fields} />
        </div>
      </div>
    </div>
  );
}

/** Findings: the app's tool / severity filter row over the first two finding cards (FindingsTab anatomy). */
export function FindingsWidget({
  atlas,
  cards = 2,
}: {
  atlas: AtlasData;
  /** finding cards shown under the filters */
  cards?: number;
}) {
  const model = createAtlasModel(atlas);
  const all = model.findings;
  const present = TOOLS.filter((t) =>
    all.some((f) => reportsOf(f).some((r) => r.tool === t)),
  );
  const [tools, setTools] = useState<Set<FindingTool>>(() => new Set(TOOLS));
  const [sevs, setSevs] = useState<Set<Risk>>(() => new Set(SEVERITIES));
  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (!next.delete(v)) next.add(v);
    return next;
  };
  const shown = all.filter(
    (f) =>
      sevs.has(f.risk ?? "low") && reportsOf(f).some((r) => tools.has(r.tool)),
  );
  return (
    <Panel
      label="Findings"
      aside={`${shown.length}/${all.length} shown`}
      className="w-full max-w-[520px]"
    >
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {present.map((t) => (
          <ToggleChip
            key={t}
            label={`${TOOL_LABEL[t]} ${all.filter((f) => reportsOf(f).some((r) => r.tool === t)).length}`}
            on={tools.has(t)}
            onToggle={() => setTools(toggle(tools, t))}
          />
        ))}
        <span className="w-2" />
        {SEVERITIES.filter((s) => all.some((f) => (f.risk ?? "low") === s)).map(
          (s) => (
            <ToggleChip
              key={s}
              label={`${SEVERITY_LABEL[s]} ${all.filter((f) => (f.risk ?? "low") === s).length}`}
              on={sevs.has(s)}
              onToggle={() => setSevs(toggle(sevs, s))}
            />
          ),
        )}
      </div>
      <div className="m-2 mt-0 grid gap-2 rounded-inner border border-border bg-inner-grad p-2">
        {shown.slice(0, cards).map((f) => {
          const rs = reportsOf(f);
          return (
            <div
              key={f.id}
              className="flex min-w-0 flex-col gap-1.5 rounded-card border border-border bg-card-grad px-3 py-2.5 shadow-soft"
            >
              <span className="flex items-center gap-1.5">
                <Chip
                  tone={
                    f.risk === "high" || f.risk === "med" ? "bad" : "neutral"
                  }
                  dot
                >
                  {SEVERITY_LABEL[f.risk ?? "low"]}
                </Chip>
                <Chip>
                  {[...new Set(rs.map((r) => TOOL_LABEL[r.tool]))].join(" + ")}
                </Chip>
              </span>
              <span className="truncate text-[13px] text-fg">
                <span className="font-mono text-dim">{f.name.slice(0, 4)}</span>{" "}
                {titleOf(f)}
              </span>
              <span className="truncate font-mono text-dim text-xs">
                {f.detector ?? rs[0].detector}
                {` · L${lineRanges(flaggedLines(f, model.lineOf(f)))}`}
              </span>
            </div>
          );
        })}
        {shown.length > cards && (
          <span className="px-1 text-[12.5px] text-dim">
            +{shown.length - cards} more in the app
          </span>
        )}
        {!shown.length && (
          <span className="px-2 py-6 text-center text-[12.5px] text-dim">
            No findings match the filters
          </span>
        )}
      </div>
    </Panel>
  );
}

/** Coverage: the app's own CoverageSummary card (test coverage + audit focus list). */
export function CoverageWidget({
  atlas,
  partly,
}: {
  atlas: AtlasData;
  partly?: boolean;
}) {
  const model = createAtlasModel(atlas);
  return (
    <div className="w-full max-w-[460px]">
      <CoverageSummary model={model} onSelect={() => {}} partly={partly} />
    </div>
  );
}
