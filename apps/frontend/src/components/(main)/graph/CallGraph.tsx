"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTree,
  type DisplayKind,
  displayKind,
  edgeLabel,
  type Frame,
  layoutTree,
  usePanZoom,
} from "@/features/trace";
import { GraphNode, NODE_W, nodeHeight } from "./GraphNode";
import { ZoomControls } from "./ZoomControls";

const ANCHOR = 28; // edge attaches at the card header

export function CallGraph({
  frames,
  hidden,
  selected,
  onSelect,
}: {
  frames: Frame[];
  hidden: Set<DisplayKind>;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const vp = useRef<HTMLDivElement>(null);
  const { view, zoomAt, fit, moved } = usePanZoom(vp);
  const [dragId, setDragId] = useState<number | null>(null);
  const dragged = useRef(false);
  const viewK = useRef(view.k);
  viewK.current = view.k;

  const base = useMemo(() => {
    const visible = frames
      .map((frame, index) => ({ frame, index }))
      .filter(({ frame }) => !hidden.has(displayKind(frame)));
    return layoutTree(buildTree(visible), (n) => nodeHeight(n.frame));
  }, [frames, hidden]);

  // per-node drag offsets on top of the auto layout; tied to `base`, so a new
  // test or filter change starts from the clean layout again
  type Offsets = Record<number, { dx: number; dy: number }>;
  const [drag, setDrag] = useState<{ base: typeof base; offset: Offsets }>({
    base,
    offset: {},
  });
  const offset = drag.base === base ? drag.offset : {};
  const setOffset = (fn: (o: Offsets) => Offsets) =>
    setDrag((d) => ({ base, offset: fn(d.base === base ? d.offset : {}) }));

  const { placed, edges, size } = useMemo(() => {
    const placed = base.map((p) => {
      const o = offset[p.node.index];
      return o ? { ...p, x: p.x + o.dx, y: p.y + o.dy } : p;
    });
    const at = new Map(placed.map((p) => [p.node.index, p]));
    const edges = placed.flatMap((p) =>
      p.node.children.map((c) => {
        const q = at.get(c.index);
        const x1 = p.x + NODE_W;
        const y1 = p.y + ANCHOR;
        const x2 = q?.x ?? 0;
        const y2 = (q?.y ?? 0) + ANCHOR;
        return {
          id: `${p.node.index}-${c.index}`,
          to: c.index,
          x1,
          y1,
          x2,
          y2,
          label: edgeLabel(c.frame),
        };
      }),
    );
    const size = {
      w: Math.max(NODE_W, ...placed.map((p) => p.x + NODE_W)),
      h: Math.max(1, ...placed.map((p) => p.y + p.h)),
    };
    return { placed, edges, size };
  }, [base, offset]);

  // fit only when the layout itself changes, not on every drag
  const baseSize = useMemo(
    () => ({
      w: Math.max(NODE_W, ...base.map((p) => p.x + NODE_W)),
      h: Math.max(1, ...base.map((p) => p.y + p.h)),
    }),
    [base],
  );
  useEffect(() => fit(baseSize.w, baseSize.h), [fit, baseSize]);

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = offset[index] ?? { dx: 0, dy: 0 };
    dragged.current = false;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / viewK.current;
      const dy = (ev.clientY - sy) / viewK.current;
      if (!dragged.current && Math.abs(dx) + Math.abs(dy) < 3) return;
      dragged.current = true;
      setDragId(index);
      setOffset((o) => ({
        ...o,
        [index]: { dx: start.dx + dx, dy: start.dy + dy },
      }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragId(null);
      // let the click that follows pointerup see the drag, then clear
      setTimeout(() => {
        dragged.current = false;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={vp}
      className="dot-grid relative h-full min-h-[440px] cursor-grab overflow-hidden border border-line bg-tray active:cursor-grabbing"
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
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          width={1}
          height={1}
          aria-hidden="true"
        >
          {edges.map((e) => {
            const m = (e.x1 + e.x2) / 2;
            const on = e.to === selected;
            return (
              <g key={e.id}>
                <path
                  d={`M${e.x1} ${e.y1} C${m} ${e.y1} ${m} ${e.y2} ${e.x2} ${e.y2}`}
                  fill="none"
                  className={on ? "stroke-accent" : "stroke-edge"}
                  strokeWidth={on ? 1.6 : 1.2}
                />
                <rect
                  x={e.x1 - 3.5}
                  y={e.y1 - 3.5}
                  width={7}
                  height={7}
                  className="fill-shell stroke-tick"
                  strokeWidth={1.5}
                />
                <rect
                  x={e.x2 - 3.5}
                  y={e.y2 - 3.5}
                  width={7}
                  height={7}
                  className="fill-shell stroke-tick"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </svg>
        {edges.map((e) => (
          <span
            key={`l-${e.id}`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-line bg-shell px-1.5 py-px text-[9.5px] text-muted ui-label"
            style={{ left: (e.x1 + e.x2) / 2, top: (e.y1 + e.y2) / 2 }}
          >
            {e.label}
          </span>
        ))}
        {placed.map((p, order) => (
          <GraphNode
            key={p.node.index}
            frame={p.node.frame}
            x={p.x}
            y={p.y}
            order={order}
            selected={selected === p.node.index}
            dragging={dragId === p.node.index}
            onDragStart={startDrag(p.node.index)}
            onSelect={() => {
              if (!moved.current && !dragged.current) onSelect(p.node.index);
            }}
          />
        ))}
      </div>
      <ZoomControls
        onIn={() => zoomAt(1.25)}
        onOut={() => zoomAt(0.8)}
        onFit={() => fit(size.w, size.h)}
        onReset={
          Object.keys(offset).length ? () => setOffset(() => ({})) : undefined
        }
      />
    </div>
  );
}
