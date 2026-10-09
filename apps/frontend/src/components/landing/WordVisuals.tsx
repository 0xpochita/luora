"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FindingTriage } from "@/components/(main)/atlas/FindingTriage";
import { PieceIcon } from "@/components/(main)/atlas/PieceIcon";
import {
  GraphNode,
  nodeHeight as graphNodeHeight,
  NODE_W,
  PORT_Y,
} from "@/components/(main)/graph/GraphNode";
import { ICON_PATH, iconOf, SYSTEMS, type TriageState } from "@/features/atlas";
import type { AtlasData, Piece } from "@/features/atlas/types";
import { linesOf, SEVERITY } from "@/features/atlas/utils/audit";
import { hitLabel } from "@/features/atlas/utils/coverage";
import { OPEN, reportsOf } from "@/features/atlas/utils/findings";
import { flowLayout } from "@/features/atlas/utils/flow-layout";
import { nodeHeight as labNodeHeight } from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { unitCode } from "@/features/atlas/utils/units";
import { buildTree, type Frame, layoutTree } from "@/features/trace";
import { tokenize } from "@/features/trace/utils/highlight";
import { LabGraph, TraceWidget } from "./FeatureWidgets";
import type { LabDemo } from "./stats";
import { Window } from "./Window";

/**
 * The product visuals beside the giant words (BigWords): Trace, Test, Triage. Same data and the
 * same parts as the app (TraceWidget, GraphNode, LabGraph, FindingTriage, PieceIcon, flowLayout,
 * coverage hits), drawn live from the sample run; each panel sits in a Fit box that scales it down
 * to its column, so it is always whole. Built only once its spot nears the screen (Lazy).
 */

/** scales its child down (never up) to the box width; the box takes the scaled height */
function Fit({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ k: 1, h: 0 });
  useEffect(() => {
    const b = box.current;
    const c = inner.current;
    if (!b || !c) return;
    const fit = () => {
      const k = Math.min(1, b.clientWidth / c.offsetWidth);
      setSize({ k, h: c.offsetHeight * k });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className={`relative min-w-0 ${className}`}
      style={{ height: size.h || undefined }}
    >
      <div
        ref={inner}
        className="absolute top-0 left-1/2 w-max origin-top"
        style={{ transform: `translateX(-50%) scale(${size.k})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** the panel chrome every mini UI shares: graphite card, white dot + title, dim aside */
function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-white/[.08] bg-card-grad p-1.5 shadow-float">
      <p className="flex items-center gap-2 px-2.5 pt-1.5 pb-2 text-[13px] text-fg">
        <span className="size-1.5 rounded-full bg-white" />
        {title}
        {aside && (
          <span className="ml-auto pl-6 font-mono text-[11.5px] text-dim">
            {aside}
          </span>
        )}
      </p>
      <div className="rounded-[10px] border border-white/[.05] bg-inner-grad">
        {children}
      </div>
    </div>
  );
}

type Model = ReturnType<typeof createAtlasModel>;

/** Source: the worst finding's function, its marked lines red, forge coverage hits in the gutter. */
function MiniSource({ model, f }: { model: Model; f?: Piece }) {
  const host =
    (f?.links ?? [])
      .map((id) => model.byId[id])
      .find((p) => p?.sys === "entry") ?? f;
  if (!host) return null;
  const lines = linesOf(model, host).slice(0, 8);
  const bad = new Set(
    model.findings.flatMap((x) =>
      (x.mark ?? [0]).map((m) => model.lineOf(x) + m),
    ),
  );
  const hits = model.coverage?.hits;
  return (
    <Panel
      title="Source"
      aside={`${model.file.split("/").pop()} L${lines[0] + 1}–${lines[lines.length - 1] + 1}`}
    >
      {f && (
        <p className="px-3 pt-2.5 pb-1.5 font-mono text-[11.5px] text-text">
          {f.name}
        </p>
      )}
      <ol className="pb-2 font-mono text-[11.5px] leading-[1.95]">
        {lines.map((n) => (
          <li
            key={n}
            className={`flex gap-3 pr-4 ${bad.has(n) ? "bg-red/[.08] shadow-[inset_2px_0_0_var(--red)]" : ""}`}
          >
            <span className="w-8 text-right text-white/25">{n + 1}</span>
            <span className="w-8 text-right text-dim/80">
              {hits?.[n] == null ? "" : hits[n] ? hitLabel(hits[n]) : "0"}
            </span>
            <span className="whitespace-pre text-white/80">
              {tokenize(model.lines[n] ?? "").map((t, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: tokens of one static line
                  key={i}
                  className={t.type === "plain" ? "" : `tok-${t.type}`}
                >
                  {t.text}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Flow: the first entry points as lanes of their steps in order; red ring = written after a call. */
function MiniFlow({ model }: { model: Model }) {
  const lanes = flowLayout(model).lanes.slice(0, 4);
  const R = 11;
  const DX = 34;
  const LW = 150;
  const H = 46;
  const n = Math.max(...lanes.map((l) => l.nodes.length));
  const W = LW + n * DX + 12;
  return (
    <Panel title="Flow" aside={`${lanes.length} entry points`}>
      <svg
        viewBox={`0 0 ${W} ${lanes.length * H + 8}`}
        width={W}
        height={lanes.length * H + 8}
        className="block"
        role="img"
        aria-label="Entry points as the order of their checks, reads, calls and writes"
      >
        {lanes.map((l, li) => {
          const y = 4 + li * H + H / 2;
          const last = LW + (l.nodes.length - 1) * DX;
          return (
            <g key={l.id}>
              <text
                x="12"
                y={y + 4}
                fill="var(--text)"
                fontSize="12"
                fontFamily="var(--font-geist-mono)"
              >
                {l.sig.length > 18 ? `${l.sig.slice(0, 17)}…` : l.sig}
              </text>
              <path
                d={`M${LW} ${y}H${last}`}
                stroke="var(--wire)"
                strokeOpacity="0.6"
              />
              {l.nodes.map((nd, i) => {
                const p = model.byId[nd.id];
                const icon =
                  nd.kind === "entry"
                    ? "plug"
                    : nd.kind === "ret"
                      ? "cycle"
                      : p
                        ? iconOf(p)
                        : "grid";
                const x = LW + i * DX;
                return (
                  <g key={nd.key} transform={`translate(${x} ${y})`}>
                    <circle
                      r={R}
                      fill="var(--raised)"
                      stroke={nd.late ? "var(--red)" : "#fff"}
                      strokeOpacity={nd.late ? 0.9 : 0.14}
                    />
                    <path
                      d={ICON_PATH[icon]}
                      transform="translate(-6 -6) scale(.5)"
                      fill="none"
                      stroke={nd.late ? "var(--red)" : "var(--port)"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

/** Quick search: what typing 'dep' lists, matched the way the app's QuickSearch matches. */
function MiniSearch({ model }: { model: Model }) {
  const hits = model.pieces
    .map((p) => ({
      p,
      code: unitCode(model, p.id),
      text:
        p.sys === "vulns"
          ? `${SEVERITY[p.risk ?? "low"]} · ${p.name.replace(/^F-\d+\s*/, "")}`
          : p.name,
    }))
    .filter((h) =>
      `${h.code} ${h.p.name} ${h.text} ${SYSTEMS[h.p.sys].label}`
        .toLowerCase()
        .includes("dep"),
    )
    .slice(0, 3);
  return (
    <div className="w-[440px] rounded-[16px] border border-white/[.1] bg-card-grad p-2 shadow-float">
      <p className="flex items-center rounded-inner border border-white/[.13] bg-field px-3 py-2 text-[13.5px] text-fg">
        dep
        <span className="lp-caret ml-px h-4 w-px bg-white/70" />
        <span className="ml-auto rounded-md bg-white/[.06] px-1.5 font-mono text-[11px] text-dim">
          ⌘K
        </span>
      </p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {hits.map((h, i) => (
          <li
            key={h.p.id}
            className={`grid grid-cols-[24px_56px_1fr_auto] items-center gap-2.5 rounded-tile px-2 py-1.5 text-[13px] ${i ? "text-muted" : "bg-hover text-fg"}`}
          >
            <PieceIcon piece={h.p} />
            <span className="font-mono text-[12px] text-fg">{h.code}</span>
            <span
              className={`truncate ${h.p.sys === "vulns" ? "text-red" : ""}`}
            >
              {h.text}
            </span>
            <span className="text-[12px] text-dim">
              {SYSTEMS[h.p.sys].label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Trace: the decoded frames of one deposit (TraceWidget rows) and its call graph (GraphNode cards). */
export function TraceVisual({
  test,
  frames,
}: {
  test: string;
  frames: Frame[];
}) {
  const kids = frames.slice(1);
  const placed = layoutTree(
    buildTree(kids.map((frame, index) => ({ frame, index }))),
    (n) => graphNodeHeight(n.frame),
  );
  const at = new Map(placed.map((p) => [p.node.index, p]));
  const W = Math.max(...placed.map((p) => p.x + NODE_W));
  const H = Math.max(...placed.map((p) => p.y + p.h));
  return (
    <div className="grid gap-6">
      <Fit>
        <div className="w-[560px]">
          <TraceWidget test={test} frames={frames} />
        </div>
      </Fit>
      <Fit className="md:ml-16">
        <Panel title="Call graph" aside={`${kids.length} frames`}>
          <div inert className="dot-grid relative p-5">
            <div className="relative" style={{ width: W, height: H }}>
              <svg
                aria-hidden="true"
                className="absolute top-0 left-0 overflow-visible"
                width={1}
                height={1}
              >
                {placed.flatMap((p) =>
                  p.node.children.map((c) => {
                    const q = at.get(c.index);
                    if (!q) return null;
                    const x1 = p.x + NODE_W;
                    const y1 = p.y + PORT_Y;
                    const y2 = q.y + PORT_Y;
                    const m = (x1 + q.x) / 2;
                    return (
                      <path
                        key={c.index}
                        d={`M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${q.x} ${y2}`}
                        fill="none"
                        className="stroke-wire"
                      />
                    );
                  }),
                )}
              </svg>
              {placed.map((p, i) => (
                <GraphNode
                  key={p.node.index}
                  frame={p.node.frame}
                  x={p.x}
                  y={p.y}
                  order={i}
                  selected={false}
                  hasOut={p.node.children.length > 0}
                  onSelect={() => {}}
                />
              ))}
            </div>
          </div>
        </Panel>
      </Fit>
    </div>
  );
}

/** Test: the Lab scenario (Actor → Call → Expect revert → Assert) and the .t.sol it exports. */
export function TestVisual({
  scenario,
  sol,
}: {
  scenario: LabDemo;
  sol: { file: string; lines: string[] } | null;
}) {
  const { nodes } = scenario;
  const w = Math.max(...nodes.map((n) => n.x + n.w));
  const h = Math.max(...nodes.map((n) => n.y + labNodeHeight(n)));
  return (
    <div className="grid gap-6">
      <Fit>
        <div inert className="relative" style={{ width: w, height: h }}>
          <LabGraph
            nodes={nodes}
            wires={scenario.wires}
            runs={scenario.runs}
            fields={scenario.fields}
          />
        </div>
      </Fit>
      {sol && (
        <Fit className="md:mr-16">
          <Window tab={sol.file} aside="Export .t.sol">
            <ol className="py-3 font-mono text-[12px] leading-[1.85]">
              {sol.lines.map((l, n) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines of one static file
                  key={n}
                  className="flex gap-4 pr-6"
                >
                  <span className="w-8 flex-none text-right text-white/25">
                    {n + 1}
                  </span>
                  <span className="whitespace-pre text-white/80">
                    {tokenize(l).map((t, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: tokens of one static line
                        key={i}
                        className={t.type === "plain" ? "" : `tok-${t.type}`}
                      >
                        {t.text}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </Window>
        </Fit>
      )}
    </div>
  );
}

const READ_ONLY: TriageState = {
  map: {},
  get: () => OPEN,
  set: () => {},
  dismissed: new Set(),
};

/** Triage: findings on the line, the triage table of the worst finding, Flow replay lanes, ⌘K. */
export function TriageVisual({ atlas }: { atlas: AtlasData }) {
  const model = useMemo(() => createAtlasModel(atlas), [atlas]);
  // the finding most detectors agreed on, so its triage table shows the merged reports
  const f = model.findings.reduce<Piece | undefined>(
    (a, b) => (a && reportsOf(a).length >= reportsOf(b).length ? a : b),
    undefined,
  );
  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <Fit>
        <MiniSource model={model} f={f} />
      </Fit>
      {f && (
        <Fit>
          <div inert className="w-[440px]">
            <FindingTriage model={model} finding={f} triage={READ_ONLY} />
          </div>
        </Fit>
      )}
      <Fit>
        <MiniFlow model={model} />
      </Fit>
      <Fit>
        <MiniSearch model={model} />
      </Fit>
    </div>
  );
}
