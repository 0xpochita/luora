"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CardGradients } from "@/components/ui";
import {
  type AtlasModel,
  ICON_PATH,
  type IconKey,
  type TriageState,
} from "@/features/atlas";
import { SEVERITY } from "@/features/atlas/utils/audit";
import { pctLabel, ratio } from "@/features/atlas/utils/coverage";
import { TOOL_LABEL, TRIAGE_LABEL } from "@/features/atlas/utils/findings";
import {
  type FlowNode,
  type MapCat,
  type MapPanel,
  mapLayout,
} from "@/features/atlas/utils/map-layout";
import { usePanZoom } from "@/features/trace/hooks/usePanZoom";
import { ZoomToolbar } from "../ZoomToolbar";
import "./map.css";

/** Flow node kind → the category it belongs to (a read / write is storage, a call is external…).
 *  Categories are monochrome; only external (blue) and findings (red) light a dot. */
const KIND_CAT: Record<FlowNode["kind"], MapCat | null> = {
  gate: null,
  r: "storage",
  w: "storage",
  c: "external",
  e: "events",
};
const KIND_TAG = { gate: "Gate", r: "Read", w: "Write", c: "Call", e: "Emit" };
/** Panel cards start below their title row; wires land on the card edge this far down. */
const CARD_Y = 22;
const PORT_Y = CARD_Y + 15;

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

function Icon({
  k,
  x,
  y,
  size = 12,
}: {
  k: IconKey;
  x: number;
  y: number;
  size?: number;
}) {
  return (
    <path
      d={ICON_PATH[k]}
      transform={`translate(${x} ${y}) scale(${size / 24})`}
      className="am-ico"
    />
  );
}

/**
 * Orthogonal `M x y H x V y` wire → smooth path with rounded corners. The last `tail` points
 * move down by `dy` so the wire lands on the card edge instead of the title row above it.
 */
function smooth(d: string, dy: number, tail: number, R = 12) {
  const tok = d.match(/[MHV]|-?[\d.]+/g) ?? [];
  const pts: [number, number][] = [];
  for (let i = 0; i < tok.length; ) {
    const c = tok[i++];
    const [x, y] = pts.at(-1) ?? [0, 0];
    if (c === "M") pts.push([+tok[i++], +tok[i++]]);
    else if (c === "H") pts.push([+tok[i++], y]);
    else if (c === "V") pts.push([x, +tok[i++]]);
  }
  for (const p of pts.slice(-tail)) p[1] += dy;
  let out = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(R, l1 / 2, l2 / 2);
    if (!r) continue;
    const p = [
      b[0] - ((b[0] - a[0]) / l1) * r,
      b[1] - ((b[1] - a[1]) / l1) * r,
    ];
    const q = [
      b[0] + ((c[0] - b[0]) / l2) * r,
      b[1] + ((c[1] - b[1]) / l2) * r,
    ];
    out += `L${p[0]} ${p[1]}Q${b[0]} ${b[1]} ${q[0]} ${q[1]}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${out}L${lx} ${ly}`;
}

/** Clickable SVG group that selects a piece. */
function Hit({
  id,
  onSelect,
  className,
  transform,
  children,
  label,
}: {
  id: string | null;
  onSelect: (id: string) => void;
  className?: string;
  transform?: string;
  children: ReactNode;
  label: string;
}) {
  if (!id) return <g transform={transform}>{children}</g>;
  const act = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(id);
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`am-hit ${className ?? ""}`}
      transform={transform}
      onClick={act}
      onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && act(e)}
    >
      {children}
    </g>
  );
}

/**
 * Poster-style system map: Deploy feeds a trunk into the contract hub; each entry point is a port
 * wired to a panel with its gate → reads → calls → writes → events flow.
 */
export function MapView({
  model,
  selected,
  onSelect,
  triage,
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
  triage: TriageState;
}) {
  const L = useMemo(() => mapLayout(model), [model]);
  const ref = useRef<HTMLDivElement>(null);
  const { view, zoomAt, fit, moved } = usePanZoom(ref);
  const [ox, setOx] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  const fitAll = () => {
    const el = ref.current;
    if (!el) return;
    // centre horizontally: fit a box as wide as the stage's aspect needs, map in its middle
    const aspect = (el.clientWidth - 40) / Math.max(1, el.clientHeight - 40);
    const fw = Math.max(L.w, L.h * aspect);
    setOx(Math.round((fw - L.w) / 2));
    fit(fw, L.h);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit when the layout changes
  useEffect(fitAll, [L]);

  const select = (id: string) => {
    if (!moved.current) onSelect(id === selected ? null : id);
  };
  /** Panel that holds the selection (its own piece, a node, a row or a finding tag). */
  const owner = (p: MapPanel) =>
    !!selected &&
    (p.select === selected ||
      p.nodes.some((n) => n.id === selected) ||
      p.rows.some((r) => r.id === selected) ||
      p.findings.includes(selected));
  const lit = (key: string) =>
    hover === key ||
    (!hover && owner(L.panels.find((p) => p.key === key) as MapPanel));
  const code = (id: string) => model.byId[id]?.name.slice(0, 4) ?? id;
  const covLines = model.coverage
    ? pctLabel(ratio(model.coverage.lines))
    : null;
  const sideOf = (key: string) => L.ports.find((q) => q.key === key)?.side;

  return (
    <div
      className="amap dot-grid"
      ref={ref}
      style={{
        backgroundSize: `${22 * view.k}px ${22 * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <svg role="img" aria-label="Contract system map">
        <CardGradients />
        <defs>
          {(["wire", "late"] as const).map((c) => (
            <marker
              key={c}
              id={`am-arrow-${c}`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path
                d="M0 0L8 4L0 8Z"
                fill={c === "late" ? "var(--red)" : "var(--wire)"}
              />
            </marker>
          ))}
        </defs>
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.k}) translate(${ox} 0)`}
        >
          {/* emblem + title */}
          <rect
            x={L.emblem.x - 18}
            y={L.emblem.y - 18}
            width={36}
            height={36}
            rx={10}
            className="am-emblem"
          />
          <Icon k="grid" x={L.emblem.x - 8} y={L.emblem.y - 8} size={16} />
          <text
            x={L.emblem.x}
            y={L.emblem.y + 46}
            className="am-title"
            textAnchor="middle"
          >
            {model.contract}
          </text>
          <text
            x={L.emblem.x}
            y={L.emblem.y + 62}
            className="am-sub"
            textAnchor="middle"
          >
            {clip(model.file, 40)} · solc {model.compiler}
          </text>

          {/* deploy box + trunk */}
          <path d={L.trunk} className="am-trunk" />
          <Hit
            id={L.deploy.ctor}
            onSelect={select}
            label={`Deploy: ${L.deploy.label}`}
            className={selected === L.deploy.ctor ? "on" : ""}
            transform={`translate(${L.deploy.x} ${L.deploy.y})`}
          >
            <rect
              width={L.deploy.w}
              height={L.deploy.h}
              rx={14}
              className="am-deploy"
            />
            <text x={12} y={19} className="am-dtitle">
              Deploy
            </text>
            <text x={62} y={19} className="am-meta">
              {L.deploy.label} · runs once
            </text>
            <text
              x={L.deploy.w - 12}
              y={19}
              className="am-meta"
              textAnchor="end"
            >
              {L.deploy.chips.length ? "initial state" : ""}
            </text>
          </Hit>
          {L.deploy.chips.map((c) => (
            <Hit
              key={`${c.label}${c.imm}`}
              id={c.id}
              onSelect={select}
              label={c.label}
              className={`am-c-storage ${selected === c.id && !c.imm ? "on" : ""}`}
              transform={`translate(${L.deploy.x + c.x} ${L.deploy.y + c.y})`}
            >
              <rect
                width={c.w}
                height={c.h}
                rx={6}
                className={`am-chip ${c.imm ? "imm" : ""}`}
              />
              <text x={7} y={11} className="am-chiptx">
                {c.label}
              </text>
            </Hit>
          ))}

          {/* wires (behind hub + panels) */}
          {L.wires.map((w) => {
            const side = sideOf(w.key);
            return (
              <path
                key={w.key}
                d={smooth(
                  w.d,
                  side === "bottom" ? CARD_Y : PORT_Y - 15,
                  side === "bottom" ? 1 : 2,
                )}
                className={`am-wire am-c-${w.cat} ${lit(w.key) ? "lit" : ""}`}
              />
            );
          })}

          {/* hub column */}
          <g transform={`translate(${L.hub.x} ${L.hub.y})`}>
            <rect width={L.hub.w} height={L.hub.h} rx={18} className="am-hub" />
            <rect
              x={6}
              y={6}
              width={L.hub.w - 12}
              height={L.hub.head - 28}
              rx={12}
              className="am-inset"
            />
            <text
              x={L.hub.w / 2}
              y={24}
              className="am-meta"
              textAnchor="middle"
            >
              Contract hub
            </text>
            <text
              x={L.hub.w / 2}
              y={44}
              className="am-hubname"
              textAnchor="middle"
            >
              {model.contract}
            </text>
            <text
              x={L.hub.w / 2}
              y={64}
              className="am-meta"
              textAnchor="middle"
            >
              <tspan className="am-n">{model.entry.length}</tspan> entry ·{" "}
              <tspan className="am-n">
                {model.pieces.filter((p) => p.sys === "storage").length}
              </tspan>{" "}
              slots ·{" "}
              <tspan className="am-n">
                {model.pieces.filter((p) => p.sys === "calls").length}
              </tspan>{" "}
              calls
            </text>
            <text
              x={L.hub.w / 2}
              y={80}
              className="am-meta"
              textAnchor="middle"
            >
              Risk{" "}
              <tspan className="am-n">{model.riskScore().toFixed(1)}</tspan>
              {covLines && (
                <>
                  {" "}
                  · lines covered <tspan className="am-n">{covLines}</tspan>
                </>
              )}
            </text>
            <text x={14} y={L.hub.head - 6} className="am-side">
              ◂ User, state-changing
            </text>
            <text
              x={L.hub.w - 14}
              y={L.hub.head - 6}
              className="am-side"
              textAnchor="end"
            >
              Admin · view ▸
            </text>
          </g>
          {L.ports.map((p) => {
            const bad = !!L.panels.find((q) => q.key === p.key)?.findings
              .length;
            if (p.side === "bottom")
              return (
                <g
                  key={`p-${p.key}`}
                  className={`am-c-${p.cat} ${lit(p.key) ? "lit" : ""}`}
                >
                  <text
                    x={p.x}
                    y={p.y - 10}
                    className="am-port-b"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                  <circle cx={p.x} cy={p.y} r={3.5} className="am-dot" />
                </g>
              );
            const left = p.side === "left";
            const tx = left ? p.x + 12 : p.x - 12;
            return (
              <Hit
                key={`p-${p.key}`}
                id={p.id}
                onSelect={select}
                label={`${p.label} (${p.badge})`}
                className={`am-c-${p.cat} ${lit(p.key) ? "lit" : ""} ${selected === p.id ? "on" : ""}`}
              >
                <g
                  onPointerEnter={() => setHover(p.key)}
                  onPointerLeave={() => setHover(null)}
                >
                  <rect
                    x={left ? p.x : p.x - L.hub.w / 2}
                    y={p.y - 13}
                    width={L.hub.w / 2}
                    height={28}
                    rx={8}
                    className="am-porthit"
                  />
                  <circle cx={p.x} cy={p.y} r={3.5} className="am-dot" />
                  <Icon
                    k={p.icon}
                    x={left ? tx : tx - 12}
                    y={p.y - 10}
                    size={12}
                  />
                  <text
                    x={left ? tx + 17 : tx - 17}
                    y={p.y - 1}
                    className="am-port"
                    textAnchor={left ? "start" : "end"}
                  >
                    {clip(p.label, 17)}
                    {bad && <tspan className="am-warn"> ●</tspan>}
                  </text>
                  <text
                    x={left ? tx + 17 : tx - 17}
                    y={p.y + 10}
                    className={`am-badge ${p.badge === "anyone" ? "" : "priv"}`}
                    textAnchor={left ? "start" : "end"}
                  >
                    {p.badge}
                  </text>
                </g>
              </Hit>
            );
          })}

          {/* panels */}
          {L.panels.map((p) => {
            const side = sideOf(p.key);
            const port =
              side === "bottom"
                ? [40, CARD_Y]
                : [side === "left" ? p.w : 0, PORT_Y];
            return (
              <g
                key={p.key}
                transform={`translate(${p.x} ${p.y})`}
                className={`am-panel am-c-${p.cat} ${lit(p.key) ? "lit" : ""}`}
                onPointerEnter={() => setHover(p.key)}
                onPointerLeave={() => setHover(null)}
              >
                <rect
                  y={CARD_Y}
                  width={p.w}
                  height={p.h - CARD_Y}
                  rx={18}
                  className="am-box"
                />
                <rect
                  x={6}
                  y={CARD_Y + 6}
                  width={p.w - 12}
                  height={p.h - CARD_Y - 12}
                  rx={12}
                  className="am-inset"
                />
                <circle cx={port[0]} cy={port[1]} r={3.5} className="am-dot" />
                <Hit
                  id={p.select}
                  onSelect={select}
                  label={p.title}
                  className={selected === p.select ? "on" : ""}
                >
                  <rect
                    x={-4}
                    y={0}
                    width={p.w + 8}
                    height={CARD_Y - 2}
                    rx={8}
                    className="am-titlehit"
                  />
                  <circle cx={6} cy={10} r={3} className="am-sdot" />
                  <text x={16} y={14} className="am-ptitle">
                    {p.title}
                    {p.badge && (
                      <tspan
                        dx={6}
                        className={`am-badge ${p.badge === "anyone" ? "" : "priv"}`}
                      >
                        {p.badge}
                      </tspan>
                    )}
                  </text>
                  {p.cat === "findings" && (
                    <text
                      x={p.w - 4}
                      y={14}
                      className="am-meta"
                      textAnchor="end"
                    >
                      {p.rows.length} by severity
                    </text>
                  )}
                </Hit>
                {p.findings.slice(0, p.tagsShown).map((f, i, all) => (
                  <Hit
                    key={f}
                    id={f}
                    onSelect={select}
                    label={model.byId[f]?.name ?? f}
                    className={selected === f ? "on" : ""}
                    transform={`translate(${p.w - 4 - (all.length - i) * 38 - (p.findings.length > p.tagsShown ? 26 : 0)} 2)`}
                  >
                    <rect
                      width={34}
                      height={15}
                      rx={6}
                      className={`am-tag sev-${model.byId[f]?.risk ?? "low"}`}
                    />
                    <text
                      x={17}
                      y={11}
                      className="am-tagtx"
                      textAnchor="middle"
                    >
                      {code(f)}
                    </text>
                  </Hit>
                ))}
                {p.findings.length > p.tagsShown && (
                  <text x={p.w - 4} y={14} className="am-more" textAnchor="end">
                    +{p.findings.length - p.tagsShown}
                  </text>
                )}

                {p.edges.map((e, i) => (
                  <path
                    // biome-ignore lint/suspicious/noArrayIndexKey: edges are positional
                    key={i}
                    d={e.d}
                    className={`am-edge ${e.late ? "late am-c-late" : ""}`}
                    markerEnd={
                      e.arrow
                        ? `url(#am-arrow-${e.late ? "late" : "wire"})`
                        : undefined
                    }
                  />
                ))}
                {p.nodes.map((n) => {
                  const kc = KIND_CAT[n.kind] ?? p.cat;
                  return (
                    <Hit
                      key={`${n.kind}-${n.id}`}
                      id={n.id}
                      onSelect={select}
                      label={`${KIND_TAG[n.kind]} ${n.label}`}
                      className={`am-c-${kc} ${selected === n.id ? "on" : ""}`}
                      transform={`translate(${n.x} ${n.y})`}
                    >
                      <title>{`${KIND_TAG[n.kind]} ${n.label}${n.late ? " · written after external call" : ""}`}</title>
                      <rect
                        width={n.w}
                        height={n.h}
                        rx={7}
                        className={`am-node k-${n.kind} ${n.late ? "late" : ""} ${n.ghost ? "ghost" : ""}`}
                      />
                      {n.logo ? (
                        <image
                          href={n.logo}
                          x={4}
                          y={4}
                          width={12}
                          height={12}
                        />
                      ) : (
                        <text x={5} y={13.5} className="am-kind">
                          {KIND_TAG[n.kind][0]}
                        </text>
                      )}
                      <text x={19} y={13.5} className="am-nodetx">
                        {clip(n.label, 13)}
                      </text>
                    </Hit>
                  );
                })}

                {p.rows.map((r) => {
                  if (r.head)
                    return (
                      <g
                        key={`h-${r.label}`}
                        transform={`translate(${r.x} ${r.y})`}
                      >
                        <text x={12} y={11} className="am-rowhead">
                          {r.label}
                        </text>
                        <text
                          x={r.w - 12}
                          y={11}
                          className="am-rowhead"
                          textAnchor="end"
                        >
                          {r.meta}
                        </text>
                      </g>
                    );
                  const status =
                    r.risk && r.id ? triage.get(r.id).status : null;
                  return (
                    <Hit
                      key={`${r.id}-${r.label}`}
                      id={r.id}
                      onSelect={select}
                      label={r.label}
                      className={selected === r.id ? "on" : ""}
                      transform={`translate(${r.x} ${r.y})`}
                    >
                      <rect
                        x={4}
                        y={0}
                        width={r.w - 8}
                        height={16}
                        rx={5}
                        className="am-rowhit"
                      />
                      {r.risk ? (
                        <>
                          <rect
                            x={10}
                            y={3}
                            width={34}
                            height={11}
                            rx={4}
                            className={`am-tag sev-${r.risk}`}
                          />
                          <text
                            x={27}
                            y={11.5}
                            className="am-tagtx"
                            textAnchor="middle"
                          >
                            {SEVERITY[r.risk]}
                          </text>
                        </>
                      ) : r.logo ? (
                        <image
                          href={r.logo}
                          x={12}
                          y={2}
                          width={12}
                          height={12}
                        />
                      ) : (
                        r.icon && <Icon k={r.icon} x={12} y={2} size={12} />
                      )}
                      <text
                        x={r.risk ? 50 : 30}
                        y={12}
                        className={`am-rowtx ${status === "false-positive" || status === "duplicate" ? "dismissed" : ""}`}
                      >
                        {clip(
                          r.risk && r.id ? `${code(r.id)} ${r.label}` : r.label,
                          r.risk ? 30 : 20,
                        )}
                      </text>
                      <text
                        x={r.w - 12}
                        y={12}
                        className="am-rowmeta"
                        textAnchor="end"
                      >
                        {r.risk
                          ? `${TOOL_LABEL[r.meta as keyof typeof TOOL_LABEL] ?? r.meta} · ${status ? TRIAGE_LABEL[status] : ""}`
                          : clip(r.meta, Math.floor((r.w - 170) / 5.4))}
                      </text>
                    </Hit>
                  );
                })}

                {p.footer && (
                  <g transform={`translate(0 ${p.h - 20})`}>
                    <text
                      x={12}
                      y={13}
                      className={`am-foot ${p.footerBad ? "gap" : ""}`}
                    >
                      {p.footer}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <ZoomToolbar
        onIn={() => zoomAt(1.2)}
        onOut={() => zoomAt(1 / 1.2)}
        onFit={fitAll}
      />
      <div className="am-legend" data-no-pan>
        <span className="am-c-external">
          <i />
          External / address
        </span>
        <span className="am-c-findings">
          <i />
          Finding
        </span>
        <span className="am-c-late">
          <i className="line" />
          Write after ext. call
        </span>
        <span className="note">Gate › read › call › write › emit</span>
      </div>
    </div>
  );
}
