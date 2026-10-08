"use client";

import { useState } from "react";
import { CardGradients } from "@/components/ui";
import type { AtlasModel, SystemKey } from "@/features/atlas";
import { unitCode, unitStatus } from "@/features/atlas/utils/units";

type Hub = { key: string; label: string; sys: SystemKey[] };
const HUBS: Hub[] = [
  { key: "entry", label: "Entry points", sys: ["entry"] },
  { key: "access", label: "Access gates", sys: ["access"] },
  { key: "logic", label: "Internal logic", sys: ["logic"] },
  { key: "storage", label: "Storage slots", sys: ["storage"] },
  { key: "ext", label: "External", sys: ["deps", "calls"] },
  { key: "events", label: "Events", sys: ["events"] },
  { key: "vulns", label: "Findings", sys: ["vulns"] },
];

const W = 1200;
const H = 760;
const CARD = { x: 70, w: 220, row: 26 };
const HUB = { x: 400, w: 210, h: 34, gap: 2 };
const FAN = { x: 770, bulge: 140, step: 56, pad: 70, w: 230 }; // leaves on a right-bulging arc

/** Port dot colour for a leaf (the only colour here): red = finding / missing, yellow = gated caller, green = clear. */
const PORT = {
  finding: "var(--red)",
  missing: "var(--red)",
  privileged: "var(--yellow)",
  ok: "var(--green)",
} as const;

/** Fan-out: contract card → layer card rows → the pieces of the selected layer on an arc. */
export function ExplorerView({
  model,
  selected,
  onSelect,
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hubKey, setHubKey] = useState("entry");
  const hubs = HUBS.map((h) => ({
    ...h,
    items: model.pieces.filter((p) => h.sys.includes(p.sys)),
  })).filter((h) => h.items.length);
  const hub = hubs.find((h) => h.key === hubKey) ?? hubs[0];
  const inner = hubs.length * HUB.h + (hubs.length - 1) * HUB.gap + 8;
  const hubTop = H / 2 - (inner + 10) / 2;
  const hubY = (i: number) => hubTop + 12 + i * (HUB.h + HUB.gap);
  const hi = Math.max(0, hubs.indexOf(hub));
  const hy = hubY(hi) + HUB.h / 2;
  const n = hub?.items.length ?? 0;
  const step = Math.min(FAN.step, (H - 2 * FAN.pad) / Math.max(1, n - 1));
  const leafH = Math.max(18, Math.min(32, step - 6));
  const leaves = (hub?.items ?? []).map((p, i) => {
    const y = H / 2 + (i - (n - 1) / 2) * step;
    const t = (y - H / 2) / (H / 2 - FAN.pad);
    return { p, x: FAN.x + FAN.bulge * (1 - t * t), y };
  });
  const hx = HUB.x + HUB.w;

  const rows: [string, string][] = [
    ["File", model.file.split("/").pop() ?? model.file],
    ["Compiler", model.compiler],
    ["Risk", model.riskScore().toFixed(1)],
    ["Pieces", String(model.pieces.length)],
  ];
  const cardH = rows.length * CARD.row + 24;
  const cardY = H / 2 - cardH / 2;
  const cx = CARD.x + CARD.w;

  return (
    <div className="explorer dot-grid">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Contract explorer"
      >
        <CardGradients />
        {/* contract card: white dot + title above, rows in the nested inner card */}
        <g transform={`translate(${CARD.x} ${cardY})`}>
          <circle cx={6} cy={-13} r={3} fill="var(--fg)" />
          <text x={16} y={-8.5} className="ex-title">
            {model.contract}
          </text>
          <rect width={CARD.w} height={cardH} rx={18} className="ex-card" />
          <rect
            x={8}
            y={8}
            width={CARD.w - 16}
            height={cardH - 16}
            rx={12}
            className="ex-inset"
          />
          {rows.map(([k, v], i) => (
            <g key={k} transform={`translate(20 ${12 + i * CARD.row + 17})`}>
              <text className="ex-k">{k}</text>
              <text x={CARD.w - 40} className="ex-v" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
        </g>

        {/* contract → layer rows */}
        {hubs.map((h, i) => {
          const y = hubY(i) + HUB.h / 2;
          const on = h.key === hub?.key;
          return (
            <path
              key={`c-${h.key}`}
              d={`M${cx} ${H / 2} C${cx + 60} ${H / 2} ${HUB.x - 60} ${y} ${HUB.x} ${y}`}
              className={`ex-wire ${on ? "on" : ""}`}
            />
          );
        })}
        <circle cx={cx} cy={H / 2} r={3.5} className="ex-port" />

        {/* layer card */}
        <circle cx={HUB.x + 6} cy={hubTop - 13} r={3} fill="var(--fg)" />
        <text x={HUB.x + 16} y={hubTop - 8.5} className="ex-title">
          Layers
        </text>
        <rect
          x={HUB.x}
          y={hubTop}
          width={HUB.w}
          height={inner + 16}
          rx={18}
          className="ex-card"
        />
        <rect
          x={HUB.x + 8}
          y={hubTop + 8}
          width={HUB.w - 16}
          height={inner}
          rx={12}
          className="ex-inset"
        />
        {hubs.map((h, i) => {
          const y = hubY(i);
          const on = h.key === hub?.key;
          const bad = h.items.filter(
            (p) => p.sys === "vulns" || model.hasFinding(p.id),
          ).length;
          return (
            // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
            <g
              key={h.key}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              className={`ex-hub ${on ? "on" : ""}`}
              transform={`translate(${HUB.x} ${y})`}
              onClick={() => setHubKey(h.key)}
              onKeyDown={(e) => e.key === "Enter" && setHubKey(h.key)}
            >
              <rect
                x={12}
                width={HUB.w - 24}
                height={HUB.h}
                rx={8}
                className="ex-row"
              />
              <text x={24} y={HUB.h / 2 + 4.5} className="ex-lbl">
                {h.label}
              </text>
              {bad > 0 && h.key !== "vulns" && (
                <>
                  <circle
                    cx={HUB.w - 68}
                    cy={HUB.h / 2}
                    r={3}
                    fill="var(--red)"
                  />
                  <text x={HUB.w - 60} y={HUB.h / 2 + 4} className="ex-num bad">
                    {bad}
                  </text>
                </>
              )}
              <text
                x={HUB.w - 24}
                y={HUB.h / 2 + 4}
                className={`ex-num ${h.key === "vulns" ? "bad" : ""}`}
                textAnchor="end"
              >
                {h.items.length}
              </text>
              <circle cx={0} cy={HUB.h / 2} r={3.5} className="ex-port" />
            </g>
          );
        })}

        {/* fan-out to leaves */}
        <g key={hub?.key}>
          {leaves.map(({ p, x, y }, i) => (
            <path
              key={`f-${p.id}`}
              d={`M${hx} ${hy} C${hx + 120} ${hy} ${x - 160} ${y} ${x} ${y}`}
              pathLength={1}
              className={`ex-fan ${selected === p.id ? "on" : ""}`}
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
          <circle cx={hx} cy={hy} r={3.5} fill="var(--wire-on)" />
          {leaves.map(({ p, x, y }, i) => {
            const st = p.sys === "vulns" ? "finding" : unitStatus(model, p.id);
            const on = selected === p.id;
            const caller = p.caller && p.caller !== "anyone" ? p.caller : "";
            const max = caller ? 17 : 22;
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                className={`ex-leaf ${on ? "on" : ""}`}
                transform={`translate(${x} ${y})`}
                style={{ animationDelay: `${200 + i * 40}ms` }}
                onClick={() => onSelect(on ? null : p.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(p.id)}
              >
                <rect
                  y={-leafH / 2}
                  width={FAN.w}
                  height={leafH}
                  rx={12}
                  className="ex-leafbox"
                />
                <circle r={3.5} fill={PORT[st]} className="ex-dot" />
                <text x={14} y={4.5} className="ex-name">
                  {p.name.length > max
                    ? `${p.name.slice(0, max - 1)}…`
                    : p.name}
                </text>
                <text x={FAN.w - 12} y={4} textAnchor="end">
                  {caller && <tspan className="ex-caller">{caller} </tspan>}
                  <tspan className="ex-code">{unitCode(model, p.id)}</tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
