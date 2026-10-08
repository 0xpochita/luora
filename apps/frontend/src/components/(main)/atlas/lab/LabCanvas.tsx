"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type End,
  type GNode,
  KIND_COLOR,
  nodeHeight,
  PORT_COLOR,
  type Port,
  portOf,
  portPos,
  type Wire,
  wirePath,
} from "@/features/atlas/utils/lab-graph";
import type { NodeRun } from "@/features/atlas/utils/lab-scenario";
import { usePanZoom } from "@/features/trace/hooks/usePanZoom";

export const wireKey = (w: Wire) =>
  `${w.from.node}|${w.from.port}|${w.to.node}|${w.to.port}`;
type Side = "in" | "out";
type Pt = { x: number; y: number };
const STATUS_LABEL = {
  pass: "PASS",
  revert: "REVERT",
  fail: "FAIL",
  unknown: "?",
} as const;

/**
 * ShaderLab-style node canvas: pan (drag the background) / zoom (wheel), drag cards by their body,
 * drag from a socket to wire it (type-checked by `onConnect`), click to select, Delete to remove.
 */
export function LabCanvas({
  nodes,
  wires,
  editable,
  selected,
  selWire,
  hot,
  onSelect,
  onSelectWire,
  onMove,
  onConnect,
  onDisconnect,
  runs,
  pulse,
  widgets,
  fitKey,
}: {
  nodes: GNode[];
  wires: Wire[];
  editable: boolean;
  selected: string | null;
  selWire: string | null;
  /** cards lit by the outside selection (atlas piece) */
  hot: Set<string>;
  onSelect: (id: string | null) => void;
  onSelectWire: (key: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect?: (w: Wire) => string | null;
  onDisconnect?: (w: Wire) => void;
  runs?: Record<string, NodeRun>;
  /** cards running right now: wires into them pulse */
  pulse?: Set<string>;
  widgets?: (n: GNode) => ReactNode;
  /** refit the view when this changes */
  fitKey: string;
}) {
  const vp = useRef<HTMLDivElement>(null);
  const { view, fit, zoomAt, moved } = usePanZoom(vp);
  const [origin, setOrigin] = useState<Pt>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{
    from: End;
    side: Side;
    type: Port["type"];
    at: Pt;
    to: Pt;
    over: { end: End; side: Side; err: string | null } | null;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const live = useRef({ view, origin, nodes });
  live.current = { view, origin, nodes };

  const refit = () => {
    if (!nodes.length) return;
    const x0 = Math.min(...nodes.map((n) => n.x)) - 30;
    const y0 = Math.min(...nodes.map((n) => n.y)) - 56;
    const x1 = Math.max(...nodes.map((n) => n.x + n.w)) + 30;
    const y1 = Math.max(...nodes.map((n) => n.y + nodeHeight(n))) + 60;
    setOrigin({ x: x0, y: y0 });
    fit(x1 - x0, y1 - y0);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit only when the graph is swapped
  useEffect(refit, [fitKey, nodes.length > 0]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /** client point → canvas (world) point */
  const world = (cx: number, cy: number): Pt => {
    const r = vp.current?.getBoundingClientRect();
    const { view: v, origin: o } = live.current;
    return {
      x: (cx - (r?.left ?? 0) - v.x) / v.k + o.x,
      y: (cy - (r?.top ?? 0) - v.y) / v.k + o.y,
    };
  };
  const sockAt = (cx: number, cy: number) => {
    const el = document
      .elementFromPoint(cx, cy)
      ?.closest<HTMLElement>("[data-sock]");
    if (!el) return null;
    const [node, port, side] = (el.dataset.sock ?? "").split("|");
    return { end: { node, port }, side: side as Side };
  };
  const asWire = (a: { end: End; side: Side }, b: { end: End; side: Side }) =>
    a.side === "out" ? { from: a.end, to: b.end } : { from: b.end, to: a.end };

  // ---- dragging a card ----
  const dragCard = (e: React.PointerEvent, n: GNode) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("input, select, button, [data-sock]"))
      return;
    const start = { cx: e.clientX, cy: e.clientY, x: n.x, y: n.y };
    let didMove = false;
    const move = (ev: PointerEvent) => {
      const k = live.current.view.k;
      const dx = (ev.clientX - start.cx) / k;
      const dy = (ev.clientY - start.cy) / k;
      if (Math.abs(dx) + Math.abs(dy) > 3) didMove = true;
      if (didMove)
        onMove(n.id, Math.round(start.x + dx), Math.round(start.y + dy));
    };
    const up = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      if (!didMove) onSelect(n.id);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  };

  // ---- dragging a wire out of a socket ----
  const dragWire = (
    e: React.PointerEvent,
    n: GNode,
    port: Port,
    side: Side,
  ) => {
    e.stopPropagation();
    if (!editable || e.button !== 0) return;
    let from: End = { node: n.id, port: port.id };
    let fromSide = side;
    // grabbing a wired input picks its wire up again
    const old =
      side === "in" &&
      wires.find((w) => w.to.node === n.id && w.to.port === port.id);
    if (old) {
      onDisconnect?.(old);
      from = old.from;
      fromSide = "out";
    }
    const fromNode = byId.get(from.node) ?? n;
    const at = portPos(fromNode, from.port, fromSide);
    const type = portOf(fromNode, from.port, fromSide)?.type ?? port.type;
    setDrag({
      from,
      side: fromSide,
      type,
      at,
      to: world(e.clientX, e.clientY),
      over: null,
    });
    const move = (ev: PointerEvent) => {
      const hit = sockAt(ev.clientX, ev.clientY);
      const ok = hit && hit.side !== fromSide;
      setDrag(
        (d) =>
          d && {
            ...d,
            to: world(ev.clientX, ev.clientY),
            over: ok
              ? {
                  ...hit,
                  err: onConnect
                    ? previewError(asWire({ end: from, side: fromSide }, hit))
                    : null,
                }
              : null,
          },
      );
    };
    const up = (ev: PointerEvent) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      setDrag(null);
      const hit = sockAt(ev.clientX, ev.clientY);
      if (!hit || hit.side === fromSide || !onConnect) return;
      const err = onConnect(asWire({ end: from, side: fromSide }, hit));
      if (err) setToast(`Can't wire: ${err}`);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  };
  // dry-run of onConnect's checks for the hover colour (onConnect itself commits)
  const previewError = (w: Wire): string | null => {
    const a = byId.get(w.from.node);
    const b = byId.get(w.to.node);
    const pa = a && portOf(a, w.from.port, "out");
    const pb = b && portOf(b, w.to.port, "in");
    if (!pa || !pb) return "no such port";
    if (a === b) return "same card";
    return pa.type === pb.type ? null : `${pa.type} → ${pb.type}`;
  };

  const sock = (n: GNode, p: Port, side: Side, wired: boolean) => (
    <i
      key={`${side}${p.id}`}
      data-sock={`${n.id}|${p.id}|${side}`}
      data-no-pan
      className={`sock ${side} ${p.type} ${wired ? "on" : ""} ${
        drag?.over?.end.node === n.id && drag.over.end.port === p.id
          ? drag.over.err
            ? "bad"
            : "ok"
          : ""
      }`}
      style={{ "--c": PORT_COLOR[p.type] } as React.CSSProperties}
      title={`${p.label} · ${p.type}`}
      onPointerDown={(e) => dragWire(e, n, p, side)}
    />
  );
  const isWired = (n: string, p: string, side: Side) =>
    wires.some((w) =>
      side === "in"
        ? w.to.node === n && w.to.port === p
        : w.from.node === n && w.from.port === p,
    );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: background click clears the selection (Esc does the same from the keyboard)
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc is handled globally by LabView
    <div
      ref={vp}
      className="lab-canvas"
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
      }}
      onClick={(e) => {
        if (moved.current || (e.target as HTMLElement).closest(".lab-card"))
          return;
        onSelect(null);
        onSelectWire(null);
      }}
    >
      <div
        className="lab-world"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k}) translate(${-origin.x}px, ${-origin.y}px)`,
        }}
      >
        <svg className="lab-wires" aria-hidden="true">
          {wires.map((w) => {
            const a = byId.get(w.from.node);
            const b = byId.get(w.to.node);
            if (!a || !b) return null;
            const type = portOf(a, w.from.port, "out")?.type ?? "flow";
            const d = wirePath(
              portPos(a, w.from.port, "out"),
              portPos(b, w.to.port, "in"),
            );
            const k = wireKey(w);
            const lit =
              selWire === k ||
              selected === a.id ||
              selected === b.id ||
              hot.has(a.id) ||
              hot.has(b.id);
            return (
              <g
                key={k}
                className={`wire ${type} ${lit ? "lit" : ""} ${pulse?.has(b.id) ? "pulse" : ""}`}
              >
                <path
                  d={d}
                  className="vis"
                  style={{ stroke: PORT_COLOR[type] }}
                />
                {editable && (
                  // biome-ignore lint/a11y/noStaticElementInteractions: wide invisible hit area for the thin wire
                  <path
                    d={d}
                    className="hit"
                    data-no-pan
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWire(k);
                    }}
                  />
                )}
              </g>
            );
          })}
          {drag && (
            <path
              className={`wire drag ${drag.over?.err ? "bad" : ""}`}
              d={
                drag.side === "out"
                  ? wirePath(drag.at, drag.to)
                  : wirePath(drag.to, drag.at)
              }
              style={{
                stroke: drag.over?.err ? "var(--bad)" : PORT_COLOR[drag.type],
              }}
            />
          )}
        </svg>
        {nodes.map((n) => {
          const r = runs?.[n.id];
          const rows = Math.max(n.inputs.length, n.outputs.length);
          return (
            <div
              key={n.id}
              data-no-pan
              className={`lab-card ${n.kind} ${selected === n.id ? "sel" : ""} ${hot.has(n.id) ? "hot" : ""} ${r ? `run-${r.status}` : ""} ${pulse?.has(n.id) ? "running" : ""}`}
              style={{ left: n.x, top: n.y, width: n.w, height: nodeHeight(n) }}
              onPointerDown={(e) => dragCard(e, n)}
            >
              <header style={{ background: KIND_COLOR[n.kind] }}>
                {n.flow &&
                  sock(
                    n,
                    { id: "then", label: "then", type: "flow" },
                    "in",
                    isWired(n.id, "then", "in"),
                  )}
                {n.logo && (
                  <span
                    className="logo"
                    style={{ backgroundImage: `url(${n.logo})` }}
                  />
                )}
                <b title={n.title}>{n.title}</b>
                {n.badges?.map((b) => (
                  <span
                    key={b.label}
                    className={`badge ${b.tone}`}
                    title={b.title}
                  >
                    {b.label}
                  </span>
                ))}
                {r && (
                  <span className={`badge st ${r.status}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                )}
                {n.flow &&
                  sock(
                    n,
                    { id: "then", label: "then", type: "flow" },
                    "out",
                    isWired(n.id, "then", "out"),
                  )}
              </header>
              {!!n.widgets && <div className="widgets">{widgets?.(n)}</div>}
              {Array.from({ length: rows }, (_, i) => {
                const pi = n.inputs[i];
                const po = n.outputs[i];
                return (
                  <div className="prow" key={`${pi?.id ?? ""}${po?.id ?? i}`}>
                    {pi && (
                      <span className="pin">
                        {sock(n, pi, "in", isWired(n.id, pi.id, "in"))}
                        <em title={pi.label}>{pi.label}</em>
                      </span>
                    )}
                    {po && (
                      <span className="pout">
                        <em title={po.label}>{po.label}</em>
                        {sock(n, po, "out", isWired(n.id, po.id, "out"))}
                      </span>
                    )}
                  </div>
                );
              })}
              {n.rows?.map((t) => (
                <div className="trow" key={t} title={t}>
                  {t}
                </div>
              ))}
              {r && (
                <div className={`lab-result ${r.status}`}>
                  <b>{r.head}</b>
                  {r.lines.slice(0, 4).map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="lab-zoom" data-no-pan>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            zoomAt(1.2);
          }}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            zoomAt(1 / 1.2);
          }}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            refit();
          }}
          title="Fit to view"
        >
          Fit
        </button>
      </div>
      {toast && <div className="lab-toast">{toast}</div>}
    </div>
  );
}
