"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AtlasModel,
  type CitySim,
  ICON_PATH,
  type IconKey,
  iconOf,
  type Piece,
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
import { ZoomControls } from "../../graph/ZoomControls";
import "./flow.css";

const { r, trunkX, labelX, labelW, nodeX, revertR, badge } = FLOW;
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
  if (n.kind === "ret") return "RETURN";
  if (n.kind === "access") {
    const caller = model.byId[lane.id]?.caller ?? "anyone";
    return caller === "anyone"
      ? lane.gates.length || lane.reverts.length
        ? "CHECKS"
        : "OPEN"
      : caller.toUpperCase();
  }
  if (!p) return n.id;
  if (p.sys === "storage") return slotName(p);
  if (p.sys === "calls")
    return p.member ?? p.name.replace(/\(.*$/, "").split(".").pop() ?? p.name;
  return p.name;
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
  sim: CitySim;
}) {
  const L = useMemo(() => flowLayout(model), [model]);
  const vp = useRef<HTMLDivElement>(null);
  const { view, zoomAt, fit, moved } = usePanZoom(vp);
  const [hover, setHover] = useState<string | null>(null);
  // a step / play click on another lane selects that lane first; the sim catches up next render
  const pending = useRef<{ lane: string; step: number } | null>(null);

  const fitView = () => {
    const el = vp.current;
    if (!el) return;
    fit(L.w, L.h);
    const k = Math.min(
      1.1,
      (el.clientWidth - 40) / L.w,
      (el.clientHeight - 40) / L.h,
    );
    const y = Math.max(20, (el.clientHeight - L.h * k) / 2);
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
      className="flow hud-grid"
      style={{
        backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
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
          height={L.h}
          viewBox={`0 0 ${L.w} ${L.h}`}
          role="img"
          aria-label={`${model.contract} execution flow`}
          className={hover ? "fl-hovering" : ""}
        >
          <defs>
            <pattern
              id="fl-hatch"
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="5" height="5" fill="var(--panel)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="5"
                stroke="#4a4f56"
                strokeWidth="2"
              />
            </pattern>
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

          <Legend x={L.legend.x} y={L.legend.y} coverage={!!model.coverage} />

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
                DEPLOY
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
                IDLE STATE
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
                <line
                  x1={trunkX}
                  y1={lane.cy}
                  x2={labelX}
                  y2={lane.cy}
                  className="fl-wire"
                />
                <rect
                  x={trunkX - 2.5}
                  y={lane.cy - 2.5}
                  width={5}
                  height={5}
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
                    <path
                      d={`M0 0H${labelW - 10}L${labelW} 10V52H0Z`}
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
                      {caller.toUpperCase()}
                    </text>
                  </g>
                  {/* biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button */}
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`Replay ${lane.sig}`}
                    className={`fl-play ${live && sim.playing ? "on" : ""}`}
                    transform={`translate(${labelW - 22} 32)`}
                    onClick={() =>
                      live && sim.playing ? sim.pause() : goStep(lane.id, -1)
                    }
                    onKeyDown={keys(() => goStep(lane.id, -1))}
                  >
                    <title>
                      {live && sim.playing ? "Pause" : "Replay steps"}
                    </title>
                    <rect width={16} height={14} />
                    <path
                      d={
                        live && sim.playing
                          ? "M5 3.5v7M11 3.5v7"
                          : "M5.5 3l6 4-6 4z"
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
                        className="fl-disc"
                        style={
                          n.untested ? { fill: "url(#fl-hatch)" } : undefined
                        }
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
                          <rect width={24} height={11} className="fl-tag" />
                          <text
                            x={12}
                            y={8.5}
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
                      <text y={r + 13} textAnchor="middle" className="fl-cap">
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
              ["EVENTS EMITTED", L.eventsY, L.events.length],
              ["FINDINGS", L.findingsY, L.findings.length],
            ] as const
          ).map(([label, y, n]) => (
            <g key={label}>
              <line
                x1={labelX}
                y1={y - 6}
                x2={L.w - 24}
                y2={y - 6}
                className="fl-rule"
              />
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
                <text y={r + 13} textAnchor="middle" className="fl-cap">
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
                    <rect width={16} height={10} className="fl-tool" />
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
                <text y={r + 13} textAnchor="middle" className="fl-cap">
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

      <ZoomControls
        onIn={() => zoomAt(1.2)}
        onOut={() => zoomAt(1 / 1.2)}
        onFit={() => fit(L.w, L.h)}
      />
    </div>
  );
}

const SWATCH: [FlowKind | "revert" | "late" | "untested", string][] = [
  ["entry", "Entry point"],
  ["access", "Access check"],
  ["r", "Read slot"],
  ["c", "External call"],
  ["w", "Write slot"],
  ["e", "Emit event"],
  ["revert", "Can revert here"],
  ["late", "Write after call (CEI)"],
  ["untested", "Never ran in tests"],
];

/** Colour / ring key, drawn in the empty band above the first lane. */
function Legend({
  x,
  y,
  coverage,
}: {
  x: number;
  y: number;
  coverage: boolean;
}) {
  const items: [string, string][] = [
    ...SWATCH.filter(([k]) => coverage || k !== "untested"),
    ["finding", "Finding (H/M/L)"],
  ];
  const col = 150;
  return (
    <g transform={`translate(${x} ${y})`} className="fl-legend">
      <path
        d={`M0 0H${FLOW.legendW - 10}L${FLOW.legendW} 10V${FLOW.legendH}H0Z`}
        className="fl-label"
      />
      <text x={12} y={18} className="fl-code">
        LEGEND
      </text>
      {items.map(([k, label], i) => (
        <g
          key={k}
          transform={`translate(${20 + Math.floor(i / 4) * col} ${38 + (i % 4) * 22})`}
        >
          {k === "revert" ? (
            <circle r={7} className="fl-rdisc" />
          ) : k === "finding" ? (
            <circle r={7} className="fl-fdisc" />
          ) : k === "late" ? (
            <g className="fl-node w">
              <circle r={8.5} className="fl-late" />
              <circle r={6} className="fl-disc" />
            </g>
          ) : (
            <g className={`fl-node ${k === "untested" ? "r" : k}`}>
              <circle
                r={7}
                className="fl-disc"
                style={
                  k === "untested" ? { fill: "url(#fl-hatch)" } : undefined
                }
              />
              {k === "access" && <circle r={4} className="fl-ring2" />}
            </g>
          )}
          <text x={16} y={3.5} className="fl-cap">
            {label}
          </text>
        </g>
      ))}
      <g transform={`translate(${20 + 3 * col} 38)`} className="fl-hint">
        {[
          "Click node: source line",
          "Double-click: open piece",
          "▶ replays the lane",
          "Hover lane: focus it",
        ].map((t, i) => (
          <text key={t} y={3.5 + i * 22} className="fl-line">
            {t}
          </text>
        ))}
      </g>
    </g>
  );
}
