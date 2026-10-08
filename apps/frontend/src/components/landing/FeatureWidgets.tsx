"use client";

import { useEffect, useRef, useState } from "react";
import { CoverageSummary } from "@/components/(main)/atlas/CoverageSummary";
import { Chip, KindIcon, Meter, Panel, ToggleChip } from "@/components/ui";
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
import { ICON_PATH } from "@/features/atlas/utils/icons";
import {
  type GNode,
  KIND_META,
  nodeHeight,
  PORT_COLOR,
  type Port,
  portOf,
  portPos,
  wirePath,
} from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { displayKind, type Frame, human, splitArgs } from "@/features/trace";
import type { LabDemo } from "./stats";
import { Window } from "./Window";
import "@/components/(main)/atlas/lab/lab.css";

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
      <ol className="p-2">
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
              <KindIcon kind={kind} />
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
                    className="hidden w-12 md:block"
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

/** Lab: Actor → Call → Expect revert, laid out and run on the server (stats.ts `labDemo`). */
export function LabWidget({ nodes, wires, runs, fields }: LabDemo) {
  const W = Math.max(...nodes.map((n) => n.x + n.w));
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setK(Math.min(1, e.contentRect.width / W)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const top = Math.min(...nodes.map((n) => n.y));
  const H = Math.max(...nodes.map((n) => n.y + nodeHeight(n))) - top;
  const wired = (n: string, p: string, side: "in" | "out") =>
    wires.some((w) =>
      side === "in"
        ? w.to.node === n && w.to.port === p
        : w.from.node === n && w.from.port === p,
    );
  const sock = (n: GNode, p: Port, side: "in" | "out") => (
    <i
      key={`${side}${p.id}`}
      className={`sock ${side} ${p.type} ${wired(n.id, p.id, side) ? "on" : ""}`}
      style={{ "--c": PORT_COLOR[p.type] } as React.CSSProperties}
      title={`${p.label} · ${p.type}`}
    />
  );
  return (
    <div ref={box} className="w-full max-w-[560px]">
      <div className="relative mx-auto" style={{ width: W * k, height: H * k }}>
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: W, height: H, transform: `scale(${k})` }}
        >
          <svg
            aria-hidden="true"
            className="lab-wires"
            style={{ top: -top, left: 0 }}
          >
            {wires.map((w) => {
              const a = byId.get(w.from.node);
              const b = byId.get(w.to.node);
              if (!a || !b) return null;
              const type = portOf(a, w.from.port, "out")?.type ?? "flow";
              return (
                <g
                  key={`${w.from.port}${w.to.node}`}
                  className={`wire ${type}`}
                >
                  <path
                    className="vis"
                    d={wirePath(
                      portPos(a, w.from.port, "out"),
                      portPos(b, w.to.port, "in"),
                    )}
                  />
                </g>
              );
            })}
          </svg>
          {nodes.map((n) => {
            const r = runs[n.id];
            const rows = Math.max(n.inputs.length, n.outputs.length);
            return (
              <div
                key={n.id}
                className={`lab-card ${n.kind} ${n.inputs.length && n.outputs.length ? "" : "solo"} ${r ? `run-${r.status}` : ""}`}
                style={{
                  left: n.x,
                  top: n.y - top,
                  width: n.w,
                  height: nodeHeight(n),
                }}
              >
                <header className="!cursor-default">
                  {n.flow &&
                    sock(n, { id: "then", label: "then", type: "flow" }, "in")}
                  <span className="kdot" />
                  <b title={n.title}>{n.title}</b>
                  {r && (
                    <span className={`badge st ${r.status}`} title={r.head}>
                      <i />
                      {r.status === "pass" ? "Pass" : "Revert"}
                    </span>
                  )}
                  {n.flow &&
                    sock(n, { id: "then", label: "then", type: "flow" }, "out")}
                </header>
                <div className="lab-body">
                  <div className="lab-inner">
                    <div className="kind">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d={ICON_PATH[KIND_META[n.kind].icon]} />
                      </svg>
                      {KIND_META[n.kind].label}
                    </div>
                    {!!n.widgets && (
                      <div>
                        {fields[n.id]?.map((f) => (
                          <div className="w" key={f.label}>
                            <span>{f.label}</span>
                            {f.select ? (
                              <select
                                defaultValue={f.value}
                                tabIndex={-1}
                                aria-label={f.label}
                              >
                                <option>{f.value}</option>
                              </select>
                            ) : (
                              <input
                                defaultValue={f.value}
                                readOnly
                                tabIndex={-1}
                                aria-label={f.label}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {Array.from({ length: rows }, (_, i) => {
                      const pi = n.inputs[i];
                      const po = n.outputs[i];
                      return (
                        <div
                          className="prow"
                          key={`${pi?.id ?? ""}${po?.id ?? i}`}
                        >
                          {pi && (
                            <span className="pin">
                              {sock(n, pi, "in")}
                              <em title={pi.label}>{pi.label}</em>
                            </span>
                          )}
                          {po && (
                            <span className="pout">
                              <em title={po.label}>{po.label}</em>
                              {sock(n, po, "out")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Findings: the app's tool / severity filter row over the first two finding cards (FindingsTab anatomy). */
export function FindingsWidget({ atlas }: { atlas: AtlasData }) {
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
        {shown.slice(0, 2).map((f) => {
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
        {shown.length > 2 && (
          <span className="px-1 text-[12.5px] text-dim">
            +{shown.length - 2} more in the app
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
export function CoverageWidget({ atlas }: { atlas: AtlasData }) {
  const model = createAtlasModel(atlas);
  return (
    <div className="w-full max-w-[440px]">
      <CoverageSummary model={model} onSelect={() => {}} />
    </div>
  );
}
