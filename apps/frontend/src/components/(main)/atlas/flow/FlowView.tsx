"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CardGradients, IconButton, Panel, Toolbar } from "@/components/ui";
import {
  type AtlasModel,
  ICON_PATH,
  type IconKey,
  iconOf,
  type Piece,
  type StepSim,
} from "@/features/atlas";
import { SEVERITY } from "@/features/atlas/utils/audit";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
import {
  FLOW,
  type FlowKind,
  type FlowLane,
  type FlowNode,
  flowLayout,
} from "@/features/atlas/utils/flow-layout";
import { protocolOf } from "@/features/atlas/utils/protocols";
import { STEP_VERB, unitCode } from "@/features/atlas/utils/units";
import { usePanZoom } from "@/features/trace";
import { ZoomToolbar } from "../ZoomToolbar";
import "./flow.css";

const { r, trunkX, labelX, labelW, nodeX, revertR, badge } = FLOW;
const TOP = 56; // headroom so the floating sim toolbar never covers the deploy node
const LANE_IN = 5; // lane card padding around the label's inner card
const MIN_K = 0.8; // first view never zooms out past readable captions; pan for the rest
const TOOL = { slither: "SL", aderyn: "AD", manual: "LU" } as const;
const SEV_LETTER = { high: "H", med: "M", low: "L", info: "I" } as const;

const cut = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
const slotName = (p: Piece) => (p.name.split("· ").pop() ?? p.name).trim();

/** Short name under a node: slot / call member / event / role. */
function caption(model: AtlasModel, lane: FlowLane, n: FlowNode): string {
  const p = model.byId[n.id];
  if (n.kind === "entry") return unitCode(model, lane.id);
  if (n.kind === "ret") return "return";
  if (n.kind === "access") {
    const caller = model.byId[lane.id]?.caller ?? "anyone";
    return caller === "anyone"
      ? lane.gates.length || lane.reverts.length
        ? "checks"
        : "open"
      : caller;
  }
  if (!p) return n.id;
  if (p.sys === "storage") return slotName(p);
  if (p.sys === "calls")
    return p.member ?? p.name.replace(/\(.*$/, "").split(".").pop() ?? p.name;
  return p.name;
}

/** 24px stroke glyph for the sim toolbar. */
function Glyph({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Icon({ k, size = 14 }: { k: IconKey; size?: number }) {
  return (
    <path
      d={ICON_PATH[k]}
      transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 24})`}
      className="fl-icon"
    />
  );
}

/**
 * Watch-UX style swimlanes: deploy → idle trunk, one lane per entry point running its steps
 * left to right, checks that can revert hanging below, events and findings as a bottom strip.
 */
export function FlowView({
  model,
  selected,
  onSelect,
  sim,
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
  sim: StepSim;
}) {
  const L = useMemo(() => flowLayout(model), [model]);
  const vp = useRef<HTMLDivElement>(null);
  const { view, zoomAt, fit, moved } = usePanZoom(vp);
  const [hover, setHover] = useState<string | null>(null);
  const [legend, setLegend] = useState(false);
  // a step / play click on another lane selects that lane first; the sim catches up next render
  const pending = useRef<{ lane: string; step: number } | null>(null);

  const fitView = () => {
    const el = vp.current;
    if (!el) return;
    const h = L.h + TOP;
    fit(L.w, h);
    const k = Math.min(
      1.1,
      (el.clientWidth - 40) / L.w,
      (el.clientHeight - 40) / h,
    );
    const y = Math.max(20, (el.clientHeight - h * k) / 2);
    if (k < MIN_K) zoomAt(MIN_K / k, 20, y);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit only when the layout changes
  useEffect(fitView, [L]);

  useEffect(() => {
    const p = pending.current;
    if (!p || sim.entry !== p.lane) return;
    pending.current = null;
    if (p.step < 0) sim.play();
    else sim.seek(p.step);
  });

  const goStep = (lane: string, step: number) => {
    if (moved.current) return;
    if (sim.entry === lane) return step < 0 ? sim.play() : sim.seek(step);
    pending.current = { lane, step };
    onSelect(lane);
  };
  const pick = (id: string) => {
    if (!moved.current) onSelect(id);
  };
  const keys = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const nodeTitle = (n: FlowNode) => {
    const p = model.byId[n.id];
    const at = n.line != null ? ` · L${n.line + 1}` : "";
    if (n.step == null)
      return `${n.kind === "access" ? "Access" : n.kind === "ret" ? "Returns" : "Entry"} · ${p?.name ?? n.id}${at}`;
    const verb = STEP_VERB[n.kind as keyof typeof STEP_VERB];
    return [
      `Step ${String(n.step + 1).padStart(2, "0")} · ${verb} ${p?.name ?? n.id}${at}`,
      n.late && "Write after an external call (checks-effects-interactions)",
      n.finding && "Has a finding",
      n.untested && "Never ran under the tests",
      `Click: show line · double-click: open ${p?.name ?? n.id}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const kindIcon = (n: FlowNode, p: Piece | undefined): IconKey => {
    if (n.kind === "access") return p?.sys === "access" ? iconOf(p) : "lock";
    return p ? iconOf(p) : "fn";
  };

  return (
    <div
      ref={vp}
      className="flow dot-grid"
      style={{
        backgroundSize: `${22 * view.k}px ${22 * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${view.x}px,${view.y}px) scale(${view.k})`,
        }}
      >
        <svg
          width={L.w}
          height={L.h + TOP}
          viewBox={`0 ${-TOP} ${L.w} ${L.h + TOP}`}
          role="img"
          aria-label={`${model.contract} execution flow`}
          className={hover ? "fl-hovering" : ""}
        >
          <CardGradients />
          <defs>
            <marker
              id="fl-arrow"
              viewBox="0 0 6 6"
              refX="5.5"
              refY="3"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0 0L6 3L0 6Z" className="fl-arrowhead" />
            </marker>
            <clipPath id="fl-logo">
              <circle r={r - 5} />
            </clipPath>
          </defs>

          {/* trunk: deploy → idle → one branch per lane */}
          <g className="fl-trunk">
            <line
              x1={trunkX}
              y1={L.deploy.y + r}
              x2={trunkX}
              y2={L.idle.y - r}
              className="fl-wire"
              markerEnd="url(#fl-arrow)"
            />
            <line
              x1={trunkX}
              y1={L.idle.y + r}
              x2={trunkX}
              y2={L.lanes.at(-1)?.cy ?? L.idle.y}
              className="fl-wire"
            />
            {/* biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button */}
            <g
              role="button"
              tabIndex={0}
              className={`fl-node entry ${selected && selected === L.deploy.id ? "sel" : ""}`}
              transform={`translate(${trunkX} ${L.deploy.y})`}
              onClick={() => L.deploy.id && pick(L.deploy.id)}
              onKeyDown={keys(() => L.deploy.id && pick(L.deploy.id))}
            >
              <title>Deploy · constructor</title>
              <circle r={r} className="fl-disc" />
              <Icon k="gear" />
              <text x={r + 10} y={-4} className="fl-head">
                Deploy
              </text>
              <text x={r + 10} y={9} className="fl-cap">
                {L.deploy.writes.length
                  ? `ctor writes ${cut(L.deploy.writes.map((id) => slotName(model.byId[id])).join(" · "), 34)}`
                  : "constructor"}
              </text>
            </g>
            <g transform={`translate(${trunkX} ${L.idle.y})`}>
              <circle r={r} className="fl-disc idle" />
              <Icon k="cylinder" />
              <text x={r + 10} y={-4} className="fl-head">
                Idle state
              </text>
              <text x={r + 10} y={9} className="fl-cap">
                {L.idle.roles.length
                  ? `checked: ${cut(L.idle.roles.map((id) => slotName(model.byId[id])).join(" · "), 34)}`
                  : `${model.entry.length} entry points`}
              </text>
            </g>
          </g>

          {L.lanes.map((lane) => {
            const entry = model.byId[lane.id];
            const cov = pieceCoverage(model, lane.id);
            const live = sim.entry === lane.id;
            const on = selected === lane.id;
            const caller = entry.caller ?? "anyone";
            const last = lane.nodes[lane.nodes.length - 1];
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: hover only dims the other lanes
              <g
                key={lane.id}
                className={`fl-lane ${hover === lane.id ? "hot" : ""} ${on ? "on" : ""}`}
                onMouseEnter={() => setHover(lane.id)}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={labelX - LANE_IN}
                  y={lane.y - LANE_IN}
                  width={lane.end - labelX + LANE_IN + 20}
                  height={lane.h}
                  rx={18}
                  className="fl-lanecard"
                />
                <line
                  x1={trunkX}
                  y1={lane.cy}
                  x2={labelX - LANE_IN}
                  y2={lane.cy}
                  className="fl-wire"
                />
                <circle
                  cx={labelX - LANE_IN}
                  cy={lane.cy}
                  r={4}
                  className="fl-joint"
                />

                {/* label: unit code, signature, access badge, coverage, play */}
                <g transform={`translate(${labelX} ${lane.cy - 26})`}>
                  {/* biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button */}
                  <g
                    role="button"
                    tabIndex={0}
                    onClick={() => pick(lane.id)}
                    onKeyDown={keys(() => pick(lane.id))}
                  >
                    <rect
                      width={labelW}
                      height={52}
                      rx={12}
                      className="fl-label"
                    />
                    <text x={10} y={15} className="fl-code">
                      {unitCode(model, lane.id)}
                    </text>
                    <text x={10} y={31} className="fl-sig">
                      {cut(lane.sig, 27)}
                    </text>
                    <text x={10} y={45} className="fl-cap">
                      {cut(
                        [
                          lane.gates.map((g) => model.byId[g].name).join(" "),
                          cov && `cov ${pctLabel(cov.pct)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "no modifier",
                        30,
                      )}
                    </text>
                  </g>
                  <g transform={`translate(${labelW - 14} 15)`}>
                    <text
                      x={-24}
                      y={0}
                      textAnchor="end"
                      className={`fl-badge ${caller === "anyone" ? "" : "gated"}`}
                    >
                      {caller}
                    </text>
                  </g>
                  {/* biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button */}
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`Replay ${lane.sig}`}
                    className={`fl-play ${live && sim.playing ? "on" : ""}`}
                    transform={`translate(${labelW - 26} 30)`}
                    onClick={() =>
                      live && sim.playing ? sim.pause() : goStep(lane.id, -1)
                    }
                    onKeyDown={keys(() => goStep(lane.id, -1))}
                  >
                    <title>
                      {live && sim.playing ? "Pause" : "Replay steps"}
                    </title>
                    <rect width={20} height={16} rx={6} />
                    <path
                      d={
                        live && sim.playing
                          ? "M7.5 4.5v7M12.5 4.5v7"
                          : "M7.5 4.5l6 3.5-6 3.5z"
                      }
                    />
                  </g>
                </g>
                <line
                  x1={labelX + labelW}
                  y1={lane.cy}
                  x2={nodeX - r - 2}
                  y2={lane.cy}
                  className="fl-wire"
                  markerEnd="url(#fl-arrow)"
                />

                {/* step connectors, lit up to the current step while replaying */}
                {lane.nodes.slice(1).map((n, i) => {
                  const a = lane.nodes[i];
                  const lit = live && n.step != null && n.step <= sim.step;
                  return (
                    <line
                      key={`w-${n.key}`}
                      x1={a.x + r}
                      y1={a.y}
                      x2={n.x - r - 2}
                      y2={n.y}
                      className={`fl-wire ${lit ? "lit" : ""}`}
                      markerEnd="url(#fl-arrow)"
                    />
                  );
                })}

                {/* checks that can revert */}
                {lane.reverts.map((v) => (
                  <g key={v.key} className="fl-revert">
                    <title>{`Reverts: ${v.reason} · L${v.line + 1}`}</title>
                    <path
                      d={`M${v.stem} ${lane.cy}V${v.y}H${v.x - revertR}`}
                      className="fl-rwire"
                    />
                    <circle
                      cx={v.stem}
                      cy={lane.cy}
                      r={2}
                      className="fl-rdot"
                    />
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r={revertR}
                      className="fl-rdisc"
                    />
                    <path
                      d={`M${v.x - 4} ${v.y - 4}l8 8M${v.x + 4} ${v.y - 4}l-8 8`}
                      className="fl-rx"
                    />
                    <text
                      x={v.x}
                      y={v.y + revertR + 11}
                      className="fl-rcap"
                      textAnchor="middle"
                    >
                      {cut(v.reason, 11)}
                    </text>
                  </g>
                ))}

                {lane.nodes.map((n) => {
                  const p = model.byId[n.id];
                  const proto = p && n.kind === "c" ? protocolOf(p) : null;
                  const now = live && n.step != null && n.step === sim.step;
                  const done = live && n.step != null && n.step < sim.step;
                  const sel =
                    n.step != null
                      ? selected === n.id
                      : n.kind === "access" &&
                        selected === n.id &&
                        n.id !== lane.id;
                  const act =
                    n.step != null
                      ? () => goStep(lane.id, n.step as number)
                      : () => pick(n.id);
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
                    <g
                      key={n.key}
                      role="button"
                      tabIndex={0}
                      className={`fl-node ${n.kind} ${now ? "now" : ""} ${done ? "done" : ""} ${sel ? "sel" : ""}`}
                      transform={`translate(${n.x} ${n.y})`}
                      onClick={act}
                      onDoubleClick={() => pick(n.id)}
                      onKeyDown={keys(act)}
                    >
                      <title>{nodeTitle(n)}</title>
                      {now && <circle r={r + 7} className="fl-halo" />}
                      {n.late && <circle r={r + 4} className="fl-late" />}
                      <circle
                        r={r}
                        className={`fl-disc ${n.untested ? "untested" : ""}`}
                      />
                      {n.kind === "access" && (
                        <circle r={r - 4} className="fl-ring2" />
                      )}
                      {proto ? (
                        <image
                          href={proto.logo}
                          x={-(r - 5)}
                          y={-(r - 5)}
                          width={(r - 5) * 2}
                          height={(r - 5) * 2}
                          clipPath="url(#fl-logo)"
                        />
                      ) : n.kind === "ret" ? (
                        <path
                          d="M6 -6V2H-5M-2 -2L-6 2L-2 6"
                          className="fl-icon"
                        />
                      ) : (
                        <Icon
                          k={kindIcon(n, p)}
                          size={n.kind === "access" ? 12 : 14}
                        />
                      )}
                      {n.late && (
                        <g transform={`translate(${r - 6} ${-r - 8})`}>
                          <rect
                            width={24}
                            height={12}
                            rx={6}
                            className="fl-tag"
                          />
                          <text
                            x={12}
                            y={9}
                            textAnchor="middle"
                            className="fl-tagtx"
                          >
                            CEI
                          </text>
                        </g>
                      )}
                      {n.finding && !n.late && (
                        <circle
                          cx={r * 0.72}
                          cy={-r * 0.72}
                          r={3.5}
                          className="fl-fdot"
                        />
                      )}
                      <text y={r + 13} textAnchor="middle" className="fl-ncap">
                        {cut(caption(model, lane, n), 10)}
                      </text>
                      {n.line != null && n.kind !== "entry" && (
                        <text
                          y={r + 24}
                          textAnchor="middle"
                          className="fl-line"
                        >
                          L{n.line + 1}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* findings on this lane */}
                {lane.findings.length > 0 && (
                  <line
                    x1={last.x + r + 3}
                    y1={lane.cy}
                    x2={lane.findings[0].x - badge}
                    y2={lane.cy}
                    className="fl-rwire"
                  />
                )}
                {lane.findings.map((f) => {
                  const p = model.byId[f.id];
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
                    <g
                      key={f.id}
                      role="button"
                      tabIndex={0}
                      className={`fl-fbadge ${p.risk ?? "low"} ${selected === f.id ? "sel" : ""}`}
                      transform={`translate(${f.x} ${lane.cy})`}
                      onClick={() => pick(f.id)}
                      onKeyDown={keys(() => pick(f.id))}
                    >
                      <title>{`${p.name} · ${SEVERITY[p.risk ?? "low"]}`}</title>
                      <circle r={badge} />
                      <text y={3.5} textAnchor="middle">
                        {SEV_LETTER[p.risk ?? "low"]}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* bottom strip: events emitted, findings by severity */}
          {(
            [
              ["Events emitted", L.eventsY, L.events.length],
              ["Findings", L.findingsY, L.findings.length],
            ] as const
          ).map(([label, y, n]) => (
            <g key={label}>
              <text x={labelX} y={y + 14} className="fl-head">
                {label}
              </text>
              <text x={labelX} y={y + 28} className="fl-cap">
                {n ? `${n} total` : "none"}
              </text>
            </g>
          ))}
          {L.events.map((e) => {
            const p = model.byId[e.id];
            const hot = !!hover && e.lanes.includes(hover);
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
              <g
                key={e.id}
                role="button"
                tabIndex={0}
                className={`fl-node e ${selected === e.id ? "sel" : ""} ${hot ? "now" : ""}`}
                transform={`translate(${e.x} ${e.y})`}
                onClick={() => pick(e.id)}
                onKeyDown={keys(() => pick(e.id))}
              >
                <title>{`${p.name} · emitted by ${e.lanes.map((l) => model.byId[l].name).join(", ") || "no entry point"}`}</title>
                <circle r={r} className="fl-disc" />
                <Icon k="waves" />
                <text y={r + 13} textAnchor="middle" className="fl-ncap">
                  {cut(p.name, 10)}
                </text>
                <text y={r + 24} textAnchor="middle" className="fl-line">
                  {e.lanes.length
                    ? cut(e.lanes.map((l) => unitCode(model, l)).join(" "), 11)
                    : "not emitted"}
                </text>
              </g>
            );
          })}
          {L.findings.map((f) => {
            const p = model.byId[f.id];
            const hot = !!hover && f.lanes.includes(hover);
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
              <g
                key={f.id}
                role="button"
                tabIndex={0}
                className={`fl-finding ${p.risk ?? "low"} ${selected === f.id ? "sel" : ""} ${hot ? "hot" : ""}`}
                transform={`translate(${f.x} ${f.y})`}
                onClick={() => pick(f.id)}
                onKeyDown={keys(() => pick(f.id))}
              >
                <title>{`${p.name} · ${SEVERITY[p.risk ?? "low"]}${p.tool ? ` · ${p.tool}` : ""}`}</title>
                <circle r={r} className="fl-fdisc" />
                <Icon k="warn" />
                {p.tool && (
                  <g transform={`translate(${r - 8} ${-r - 4})`}>
                    <rect width={16} height={10} rx={4} className="fl-tool" />
                    <text
                      x={8}
                      y={7.8}
                      textAnchor="middle"
                      className="fl-tooltx"
                    >
                      {TOOL[p.tool]}
                    </text>
                  </g>
                )}
                <text y={r + 13} textAnchor="middle" className="fl-ncap">
                  {unitCode(model, f.id)}
                </text>
                <text y={r + 24} textAnchor="middle" className="fl-line">
                  {SEVERITY[p.risk ?? "low"]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        data-no-pan
        className="absolute top-3 left-3 flex cursor-default flex-col items-start gap-2"
      >
        <Toolbar>
          <IconButton
            label="Restart"
            size="sm"
            disabled={!sim.entry}
            onClick={sim.reset}
          >
            <Glyph d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
          </IconButton>
          <IconButton
            label="Previous step"
            size="sm"
            disabled={!sim.entry || sim.step < 0}
            onClick={() => sim.seek(sim.step - 1)}
          >
            <Glyph d="M18 6l-8 6 8 6zM6 6v12" fill />
          </IconButton>
          <IconButton
            label={sim.playing ? "Pause" : "Play steps"}
            size="sm"
            active={sim.playing}
            disabled={!sim.entry}
            onClick={sim.playing ? sim.pause : sim.play}
          >
            <Glyph
              d={sim.playing ? "M8 6v12M16 6v12" : "M8 5l11 7-11 7z"}
              fill={!sim.playing}
            />
          </IconButton>
          <IconButton
            label="Next step"
            size="sm"
            disabled={!sim.entry || sim.step >= sim.steps.length - 1}
            onClick={sim.next}
          >
            <Glyph d="M6 6l8 6-8 6zM18 6v12" fill />
          </IconButton>
          <span className="px-1.5 text-[12px] text-dim">
            {sim.entry ? (
              <>
                <span className="font-mono text-muted">
                  {unitCode(model, sim.entry)}
                </span>{" "}
                step{" "}
                <span className="font-mono text-muted">
                  {Math.max(0, sim.step + 1)}/{sim.steps.length}
                </span>
              </>
            ) : (
              "Pick an entry point to replay"
            )}
          </span>
          <IconButton
            label="Legend"
            size="sm"
            active={legend}
            onClick={() => setLegend(!legend)}
          >
            <Glyph d="M5 7h.01M9 7h10M5 12h.01M9 12h10M5 17h.01M9 17h10" />
          </IconButton>
        </Toolbar>
        {legend && <Legend coverage={!!model.coverage} />}
      </div>

      <ZoomToolbar
        onIn={() => zoomAt(1.2)}
        onOut={() => zoomAt(1 / 1.2)}
        onFit={fitView}
      />
    </div>
  );
}

const SWATCH: [
  FlowKind | "revert" | "late" | "untested" | "done",
  string,
  IconKey | null,
][] = [
  ["entry", "Entry point", "in"],
  ["access", "Access check", "lock"],
  ["r", "Read slot", "cylinder"],
  ["c", "External call", "plug"],
  ["w", "Write slot (brighter ring)", "cylinder"],
  ["e", "Emit event", "waves"],
  ["revert", "Can revert here", null],
  ["late", "Write after call (CEI)", "cylinder"],
  ["untested", "Never ran in tests", "fn"],
  ["done", "Ran in this replay", "fn"],
];

/** Small swatch for the legend: a node disc / ring in a 16px box (gradients come from the flow SVG). */
function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="-9 -9 18 18" className="size-4 flex-none" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Icon / ring key, opened from the toolbar's legend tile. */
function Legend({ coverage }: { coverage: boolean }) {
  const items = SWATCH.filter(([k]) => coverage || k !== "untested");
  return (
    <Panel label="Legend" inset className="w-[380px] shadow-float">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-[12.5px] text-port">
        {items.map(([k, label, icon]) => (
          <li key={k} className="flex items-center gap-2">
            <Swatch>
              {k === "revert" ? (
                <>
                  <circle r={7} className="fl-rdisc" />
                  <path d="M-3 -3l6 6M3 -3l-6 6" className="fl-rx" />
                </>
              ) : (
                <g
                  className={`fl-node ${k === "late" ? "w" : k} ${k === "done" ? "done" : ""}`}
                >
                  {k === "late" && <circle r={8.5} className="fl-late" />}
                  <circle
                    r={k === "late" ? 6.5 : 8}
                    className={`fl-disc ${k === "untested" ? "untested" : ""}`}
                  />
                  {icon && <Icon k={icon} size={9} />}
                </g>
              )}
            </Swatch>
            {label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Swatch>
            <g className="fl-finding">
              <circle r={8} className="fl-fdisc" />
              <Icon k="warn" size={9} />
            </g>
          </Swatch>
          Finding (H/M/L)
        </li>
      </ul>
      <p className="px-3 pb-3 text-[12.5px] text-dim">
        Steps are monochrome: icon + caption tell the kind. Red = finding /
        revert, green = ran, yellow dashed = untested. Click a node for its
        source line, double-click to open it. ▶ on a lane replays it; hover a
        lane to focus it.
      </p>
    </Panel>
  );
}
