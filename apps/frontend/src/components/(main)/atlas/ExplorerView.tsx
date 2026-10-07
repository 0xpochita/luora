"use client";

import { useState } from "react";
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
const ORB = { x: 190, y: H / 2, r: 62 };
const HUB = { x: 400, w: 168, h: 50, gap: 18 };
const FAN = { x: 760, bulge: 150, step: 58, pad: 70 }; // leaves on a right-bulging arc

/** Radial fan-out: contract orb → system hubs → the pieces of the selected hub on an arc. */
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
  const total = hubs.length * HUB.h + (hubs.length - 1) * HUB.gap;
  const hubY = (i: number) => H / 2 - total / 2 + i * (HUB.h + HUB.gap);
  const hi = Math.max(0, hubs.indexOf(hub));
  const hy = hubY(hi) + HUB.h / 2;
  const n = hub?.items.length ?? 0;
  const step = Math.min(FAN.step, (H - 2 * FAN.pad) / Math.max(1, n - 1));
  const leaves = (hub?.items ?? []).map((p, i) => {
    const y = H / 2 + (i - (n - 1) / 2) * step;
    const t = (y - H / 2) / (H / 2 - FAN.pad);
    return { p, x: FAN.x + FAN.bulge * (1 - t * t), y };
  });
  const hx = HUB.x + HUB.w;

  return (
    <div className="explorer">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Contract explorer"
      >
        <defs>
          <radialGradient id="orbGlow">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
            <stop offset=".35" stopColor="#b9bdc3" stopOpacity=".6" />
            <stop offset="1" stopColor="#3a3e44" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo">
            <stop offset=".55" stopColor="#1c1e22" stopOpacity="0" />
            <stop offset=".8" stopColor="#1c1e22" stopOpacity=".9" />
            <stop offset="1" stopColor="#1c1e22" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* contract orb */}
        <circle cx={ORB.x} cy={ORB.y} r={210} fill="url(#halo)" />
        <circle
          cx={ORB.x}
          cy={ORB.y}
          r={ORB.r + 22}
          className="ex-ring"
          fill="none"
          stroke="#5a5e65"
          strokeDasharray="1 5"
        />
        <circle
          cx={ORB.x}
          cy={ORB.y}
          r={ORB.r + 8}
          className="ex-ring rev"
          fill="none"
          stroke="#3a3e44"
          strokeDasharray="10 4 2 4"
        />
        <circle
          cx={ORB.x}
          cy={ORB.y}
          r={34}
          fill="url(#orbGlow)"
          className="ex-orb"
        />
        <text
          x={ORB.x}
          y={ORB.y - 108}
          className="ex-title"
          textAnchor="middle"
        >
          {model.contract}
        </text>
        <text x={ORB.x} y={ORB.y - 90} className="ex-sub" textAnchor="middle">
          {model.file.split("/").pop()} · solc {model.compiler}
        </text>
        <g transform={`translate(${ORB.x - 34} ${ORB.y + 104})`}>
          <rect width="68" height="16" className="ex-tag" />
          <text x="34" y="11.5" className="ex-tagtx" textAnchor="middle">
            RISK {model.riskScore().toFixed(1)}
          </text>
        </g>

        {/* orb → hubs */}
        {hubs.map((h, i) => {
          const y = hubY(i) + HUB.h / 2;
          const on = h.key === hub?.key;
          return (
            <path
              key={`c-${h.key}`}
              d={`M${ORB.x + ORB.r + 22} ${ORB.y} C${ORB.x + 150} ${ORB.y} ${HUB.x - 70} ${y} ${HUB.x} ${y}`}
              fill="none"
              stroke={on ? "#e8eaec" : "#3a3e44"}
              strokeWidth={on ? 1.4 : 1}
            />
          );
        })}

        {/* hubs */}
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
              className={`ex-hub ${on ? "on" : ""}`}
              transform={`translate(${HUB.x} ${y})`}
              onClick={() => setHubKey(h.key)}
              onKeyDown={(e) => e.key === "Enter" && setHubKey(h.key)}
            >
              <path
                d={`M0 0H${HUB.w - 10}L${HUB.w} 10V${HUB.h}H0Z`}
                className="ex-hubbox"
              />
              <text x="14" y="23" className="ex-num">
                {String(h.items.length).padStart(2, "0")}
              </text>
              <text x="14" y="39" className="ex-lbl">
                {h.label.toUpperCase()}
              </text>
              {bad > 0 && h.key !== "vulns" && (
                <text x={HUB.w - 12} y="23" className="ex-bad" textAnchor="end">
                  ▲ {bad}
                </text>
              )}
            </g>
          );
        })}

        {/* fan-out to leaves */}
        <g key={hub?.key}>
          {leaves.map(({ p, x, y }, i) => (
            <path
              key={`f-${p.id}`}
              d={`M${hx} ${hy} C${hx + 140} ${hy} ${x - 220} ${y} ${x} ${y}`}
              pathLength={1}
              className={`ex-fan ${selected === p.id ? "on" : ""}`}
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
          <circle cx={hx} cy={hy} r={4} fill="#e8eaec" />
          {leaves.map(({ p, x, y }, i) => {
            const st = p.sys === "vulns" ? "finding" : unitStatus(model, p.id);
            const on = selected === p.id;
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG group acting as a button
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                className={`ex-leaf ${on ? "on" : ""} ${st}`}
                transform={`translate(${x} ${y})`}
                style={{ animationDelay: `${200 + i * 40}ms` }}
                onClick={() => onSelect(on ? null : p.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(p.id)}
              >
                <circle r={4.5} className="ex-dot" />
                <text x="14" y="-3" className="ex-name">
                  {p.name.length > 26 ? `${p.name.slice(0, 25)}…` : p.name}
                </text>
                <g transform="translate(14 4)">
                  <rect width="46" height="13" className="ex-tag" />
                  <text x="23" y="9.5" className="ex-tagtx" textAnchor="middle">
                    {unitCode(model, p.id)}
                  </text>
                  {[0, 1, 2].map((k) => (
                    <rect
                      key={k}
                      x={54 + k * 7}
                      y="2"
                      width="5"
                      height="9"
                      className={`ex-bar ${st} ${k < (st === "ok" ? 3 : st === "privileged" ? 2 : 1) ? "f" : ""}`}
                    />
                  ))}
                  {p.caller && p.caller !== "anyone" && (
                    <text x="80" y="9.5" className="ex-tagtx dim">
                      {p.caller.toUpperCase()}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
