"use client";

import { useEffect, useMemo, useRef } from "react";
import { PH, PhIcon } from "@/components/ui";
import {
  MAP,
  type MapNode,
  mapLayout,
  neighbours,
  type Protocol,
} from "@/features/explore";
import { usePanZoom } from "@/features/trace/hooks/usePanZoom";
import { ZoomToolbar } from "../atlas/ZoomToolbar";

/*
 * Protocol map (docs/ux/explore.md, Decisions):
 *  - P2 pin/914862421492319 (Visualize to organize): contracts in columns by role, left to right
 *  - P1 pin/18577417209678198 (LayerZero Scan) and L2BEAT Disco: one row per relation with its
 *    port; the wire leaves from that row and enters the contract it points to
 *  - P3 pin/8514686792355593 (Tanzu): a selection lights its wires and neighbours, the rest fades
 *  - sol2uml / Surya: relation kinds told apart, here by the word and the line style (calls and
 *    delegates solid, uses and holds dashed, deploys dotted), never by colour (DESIGN.md)
 */

const KIND_LABEL: Record<MapNode["kind"], string> = {
  contract: "Contract",
  abstract: "Abstract contract",
  library: "Library",
  interface: "Interface",
  external: "Outside",
};
/** room above the cards for the column headings */
const TOP = 40;
const DASH: Record<string, string | undefined> = {
  uses: "5 4",
  holds: "5 4",
  deploys: "1.5 4",
};

export function ProtocolMap({
  protocol,
  selected,
  onSelect,
  onOpen,
}: {
  protocol: Protocol;
  selected: string | null;
  onSelect: (name: string | null) => void;
  /** double click: drill into the contract */
  onOpen: (name: string) => void;
}) {
  const layout = useMemo(() => mapLayout(protocol), [protocol]);
  const lit = useMemo(
    () => (selected ? neighbours(protocol, selected) : null),
    [protocol, selected],
  );
  const stage = useRef<HTMLDivElement>(null);
  const { view, zoomAt, fit, moved } = usePanZoom(stage);
  const fitAll = () => fit(layout.w, layout.h + TOP + 36);
  // biome-ignore lint/correctness/useExhaustiveDependencies: fit once per protocol
  useEffect(fitAll, [layout]);

  const on = (id: string) => !lit || lit.has(id);
  const wireOn = (from: string, to: string) =>
    !!selected && (from === selected || to === selected);

  return (
    <div
      ref={stage}
      className="dot-grid absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing"
      style={{
        backgroundSize: `${22 * view.k}px ${22 * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      // a click on the empty canvas (not a drag) clears the selection
      onPointerUp={(e) => {
        if (e.target === e.currentTarget)
          setTimeout(() => !moved.current && onSelect(null));
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${view.x}px, ${view.y + TOP * view.k}px) scale(${view.k})`,
          width: layout.w,
          height: layout.h,
        }}
      >
        {/* column headings: the role of each column */}
        {layout.heads.map((h) => (
          <span
            key={h.group}
            className="absolute -top-9 text-[12.5px] text-dim"
            style={{ left: h.col * (MAP.w + MAP.colGap) + 4 }}
          >
            {h.group}
          </span>
        ))}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          width={layout.w}
          height={layout.h}
        >
          {layout.wires.map((w) => {
            const hot = wireOn(w.from, w.to);
            return (
              <path
                key={`${w.from}|${w.to}`}
                d={w.d}
                fill="none"
                stroke={hot ? "var(--wire-on)" : "var(--wire)"}
                strokeWidth={hot ? 1.4 : 1}
                strokeDasharray={DASH[w.kind]}
                opacity={selected && !hot ? 0.08 : hot ? 1 : 0.32}
              />
            );
          })}
        </svg>
        {layout.nodes.map((n) => (
          <Card
            key={n.id}
            node={n}
            selected={selected === n.id}
            faded={!on(n.id)}
            onClick={() => {
              if (!moved.current) onSelect(selected === n.id ? null : n.id);
            }}
            onOpen={n.kind === "external" ? undefined : () => onOpen(n.id)}
          />
        ))}
      </div>
      <span className="absolute bottom-3 left-3 text-[12.5px] text-dim">
        Click a contract to see its relations · double click to open it
      </span>
      <ZoomToolbar
        onIn={() => zoomAt(1.2)}
        onOut={() => zoomAt(1 / 1.2)}
        onFit={fitAll}
      />
    </div>
  );
}

function Card({
  node: n,
  selected,
  faded,
  onClick,
  onOpen,
}: {
  node: MapNode;
  selected: boolean;
  faded: boolean;
  onClick: () => void;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      data-no-pan
      onClick={onClick}
      onDoubleClick={onOpen}
      title={onOpen ? "Double click to open in the Lab" : undefined}
      className="absolute text-left transition-opacity duration-200"
      style={{
        left: n.x,
        top: n.y,
        width: MAP.w,
        opacity: faded ? 0.28 : 1,
      }}
    >
      {/* title outside, above the card (DESIGN.md node anatomy) */}
      <span className="flex h-7 items-center gap-2 px-1 text-[14px]">
        <span className="size-1.5 flex-none rounded-full bg-fg" />
        <span className="truncate font-medium text-fg">{n.title}</span>
      </span>
      <span
        className={`block rounded-card border bg-card-grad p-2 ${selected ? "glow-top border-border-strong shadow-float" : "border-border shadow-soft"}`}
        style={{ height: n.h - MAP.title }}
      >
        <span className="flex h-full flex-col rounded-inner border border-border bg-inner-grad">
          <span className="flex h-[34px] flex-none items-center gap-2 px-3 text-[13px] text-text">
            <PhIcon
              d={
                n.kind === "external"
                  ? PH.compass
                  : n.kind === "library"
                    ? PH.stack
                    : PH.code
              }
              className="size-[14px] text-muted"
            />
            {KIND_LABEL[n.kind]}
            {n.is.length > 0 && (
              <span className="ml-auto truncate text-[12px] text-dim">
                is {n.is.join(", ")}
              </span>
            )}
          </span>
          <span className="h-[22px] flex-none truncate px-3 text-[12.5px] text-body">
            {n.role}
          </span>
          {n.rows.map((r) => (
            <span
              key={r.to}
              className="flex h-[30px] flex-none items-center gap-3 pr-0 pl-3 text-[12.5px] text-port"
              title={r.members.join(", ") || undefined}
            >
              <span className="min-w-0 flex-1 truncate">
                {r.label}
                {r.manual && <span className="text-dim"> · by hand</span>}
              </span>
              {r.members.length > 0 && (
                <span className="font-mono text-[11.5px] text-dim">
                  {r.members.length}
                </span>
              )}
              {/* the row's port: the wire leaves from here (blue = something outside) */}
              <span
                className={`-mr-[11.5px] size-[7px] flex-none rounded-full ${r.outside ? "bg-blue" : "bg-port"}`}
              />
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
