"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import "./map.css";

const CATS: MapCat[] = [
  "user",
  "admin",
  "storage",
  "external",
  "events",
  "findings",
];
const CAT_LABEL: Record<MapCat, string> = {
  user: "User entry",
  admin: "Admin / view",
  storage: "Storage",
  external: "External",
  events: "Events",
  findings: "Findings",
};
/** Flow node kind → the category colour it borrows (a read / write is storage, a call is external…). */
const KIND_CAT: Record<FlowNode["kind"], MapCat | null> = {
  gate: null,
  r: "storage",
  w: "storage",
  c: "external",
  e: "events",
};
const KIND_TAG = { gate: "GATE", r: "READ", w: "WRITE", c: "CALL", e: "EMIT" };

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
  const hubC = L.hub.x + L.hub.w / 2;

  return (
    <div className="amap" ref={ref}>
      <svg role="img" aria-label="Contract system map">
        <defs>
          <radialGradient id="am-vignette">
            <stop offset="0" stopColor="#1c1d22" stopOpacity="1" />
            <stop offset=".6" stopColor="#121316" stopOpacity=".6" />
            <stop offset="1" stopColor="#0a0b0c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="am-glow">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
            <stop offset=".4" stopColor="#d9a441" stopOpacity=".45" />
            <stop offset="1" stopColor="#d9a441" stopOpacity="0" />
          </radialGradient>
          {[...CATS, "late" as const].map((c) => (
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
              <path d="M0 0L8 4L0 8Z" className={`am-c-${c}`} fill="var(--c)" />
            </marker>
          ))}
        </defs>
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.k}) translate(${ox} 0)`}
        >
          <ellipse
            cx={hubC}
            cy={L.hub.y + L.hub.h / 2}
            rx={L.w * 0.55}
            ry={L.h * 0.55}
            fill="url(#am-vignette)"
          />

          {/* emblem + title */}
          <circle
            cx={L.emblem.x}
            cy={L.emblem.y}
            r={34}
            fill="url(#am-glow)"
            className="am-pulse"
          />
          <circle
            cx={L.emblem.x}
            cy={L.emblem.y}
            r={17}
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
              rx={5}
              className="am-deploy"
            />
            <text x={10} y={18} className="am-dtitle">
              DEPLOY
            </text>
            <text x={62} y={18} className="am-meta">
              {L.deploy.label} · runs once
            </text>
            <text
              x={L.deploy.w - 10}
              y={18}
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
                rx={2}
                className={`am-chip ${c.imm ? "imm" : ""}`}
              />
              <text x={7} y={11} className="am-chiptx">
                {c.label}
              </text>
            </Hit>
          ))}

          {/* wires (behind hub + panels) */}
          {L.wires.map((w) => (
            <path
              key={w.key}
              d={w.d}
              className={`am-wire am-c-${w.cat} ${lit(w.key) ? "lit" : ""}`}
            />
          ))}

          {/* hub column */}
          <g transform={`translate(${L.hub.x} ${L.hub.y})`}>
            <path
              d={`M0 0H${L.hub.w - 14}L${L.hub.w} 14V${L.hub.h}H0Z`}
              className="am-hub"
            />
            <line
              x1={L.hub.w / 2}
              y1={L.hub.head - 8}
              x2={L.hub.w / 2}
              y2={L.hub.h - 30}
              className="am-spine"
            />
            <text
              x={L.hub.w / 2}
              y={22}
              className="am-meta"
              textAnchor="middle"
            >
              CONTRACT · HUB
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
              {model.entry.length} ENTRY ·{" "}
              {model.pieces.filter((p) => p.sys === "storage").length} SLOTS ·{" "}
              {model.pieces.filter((p) => p.sys === "calls").length} CALLS
            </text>
            <text
              x={L.hub.w / 2}
              y={80}
              className="am-meta"
              textAnchor="middle"
            >
              RISK {model.riskScore().toFixed(1)}
              {covLines && ` · LINES COVERED ${covLines}`}
            </text>
            <text x={14} y={L.hub.head - 6} className="am-side">
              ◂ USER STATE-CHANGING
            </text>
            <text
              x={L.hub.w - 14}
              y={L.hub.head - 6}
              className="am-side"
              textAnchor="end"
            >
              ADMIN · VIEW ▸
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
                    {p.label.toUpperCase()}
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
                    {bad && <tspan className="am-warn"> ▲</tspan>}
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
          {L.panels.map((p) => (
            <g
              key={p.key}
              transform={`translate(${p.x} ${p.y})`}
              className={`am-panel am-c-${p.cat} ${lit(p.key) ? "lit" : ""}`}
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover(null)}
            >
              <rect width={p.w} height={p.h} rx={7} className="am-box" />
              <rect x={0} y={7} width={3} height={16} className="am-bar" />
              <Hit
                id={p.select}
                onSelect={select}
                label={p.title}
                className={selected === p.select ? "on" : ""}
              >
                <rect
                  x={0}
                  y={0}
                  width={p.w}
                  height={26}
                  className="am-titlehit"
                />
                <Icon k={p.icon} x={12} y={9} size={12} />
                <text x={30} y={19} className="am-ptitle">
                  {p.title}
                </text>
                {p.badge && (
                  <text
                    x={36 + p.title.length * 6.6}
                    y={19}
                    className={`am-badge ${p.badge === "anyone" ? "" : "priv"}`}
                  >
                    {p.badge}
                  </text>
                )}
                {p.cat === "findings" && (
                  <text
                    x={p.w - 10}
                    y={19}
                    className="am-meta"
                    textAnchor="end"
                  >
                    {p.rows.length} · SEVERITY ▾
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
                  transform={`translate(${p.w - 10 - (all.length - i) * 38 - (p.findings.length > p.tagsShown ? 26 : 0)} 7)`}
                >
                  <rect
                    width={34}
                    height={14}
                    rx={2}
                    className={`am-tag sev-${model.byId[f]?.risk ?? "low"}`}
                  />
                  <text
                    x={17}
                    y={10.5}
                    className="am-tagtx"
                    textAnchor="middle"
                  >
                    {code(f)}
                  </text>
                </Hit>
              ))}
              {p.findings.length > p.tagsShown && (
                <text x={p.w - 10} y={18} className="am-more" textAnchor="end">
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
                      ? `url(#am-arrow-${e.late ? "late" : p.cat})`
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
                      rx={3}
                      className={`am-node k-${n.kind} ${n.late ? "late" : ""} ${n.ghost ? "ghost" : ""}`}
                    />
                    {n.logo ? (
                      <image href={n.logo} x={4} y={4} width={12} height={12} />
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
                        {r.label.toUpperCase()}
                      </text>
                      <text
                        x={r.w - 12}
                        y={11}
                        className="am-rowhead"
                        textAnchor="end"
                      >
                        {r.meta.toUpperCase()}
                      </text>
                    </g>
                  );
                const status = r.risk && r.id ? triage.get(r.id).status : null;
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
                      className="am-rowhit"
                    />
                    {r.risk ? (
                      <>
                        <rect
                          x={10}
                          y={3}
                          width={34}
                          height={11}
                          rx={2}
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
                  <line
                    x1={8}
                    x2={p.w - 8}
                    y1={0}
                    y2={0}
                    className="am-footline"
                  />
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
          ))}
        </g>
      </svg>

      <div className="am-ctl" data-no-pan>
        <button type="button" onClick={() => zoomAt(1.2)} aria-label="Zoom in">
          +
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.2)}
          aria-label="Zoom out"
        >
          −
        </button>
        <button type="button" onClick={fitAll}>
          FIT
        </button>
      </div>
      <div className="am-legend" data-no-pan>
        {CATS.map((c) => (
          <span key={c} className={`am-c-${c}`}>
            <i />
            {CAT_LABEL[c]}
          </span>
        ))}
        <span className="am-c-late">
          <i className="arrow" />
          Write after ext. call
        </span>
        <span className="note">GATE → READ → CALL → WRITE → EMIT</span>
      </div>
    </div>
  );
}
