"use client";

import { KindBadge, TONE_DOT, type Tone } from "@/components/ui";
import { displayKind, type Frame, frameRows, human } from "@/features/trace";

export const NODE_W = 300;
const TITLE_H = 24; // title row above the card
const HEAD_H = 40; // kind row inside the card
/** y of the ports / wire anchors, relative to the node top: centre of the kind row. */
export const PORT_Y = TITLE_H + HEAD_H / 2;

/** Card height from its row count, so layout never has to measure the DOM. */
export function nodeHeight(f: Frame): number {
  const rows = frameRows(f).length;
  return TITLE_H + HEAD_H + (rows ? rows * 28 + 13 : 0);
}

const Port = ({ tone, side }: { tone: Tone; side: "l" | "r" }) => (
  <span
    className={`absolute size-2 rounded-full ring-2 ring-canvas ${TONE_DOT[tone]} ${side === "l" ? "-left-1" : "-right-1"}`}
    style={{ top: HEAD_H / 2 - 4 }}
  />
);

export function GraphNode({
  frame,
  x,
  y,
  order,
  selected,
  hasOut,
  dragging = false,
  onSelect,
  onDragStart,
}: {
  frame: Frame;
  x: number;
  y: number;
  order: number;
  selected: boolean;
  /** draws the output port (node has children) */
  hasOut: boolean;
  dragging?: boolean;
  onSelect: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
}) {
  const kind = displayKind(frame);
  const rows = frameRows(frame);
  const status: Tone = !frame.ok ? "bad" : kind === "EVENT" ? "neutral" : "ok";
  return (
    <button
      type="button"
      data-no-pan
      onClick={onSelect}
      onPointerDown={onDragStart}
      aria-pressed={selected}
      style={{
        left: x,
        top: y,
        width: NODE_W,
        animationDelay: `${Math.min(order * 30, 700)}ms`,
      }}
      className={`group absolute flex animate-pop touch-none select-none flex-col text-left font-mono text-xs ${dragging ? "z-10 cursor-grabbing" : "cursor-pointer"}`}
    >
      <span
        className="flex items-center gap-2 px-1 text-[12.5px]"
        style={{ height: TITLE_H }}
      >
        <span
          className={`size-1.5 flex-none rounded-full ${TONE_DOT[status]}`}
        />
        <span className="truncate text-fg">
          <span className="text-muted">{frame.to}</span>.{frame.fn}
        </span>
        {frame.gas != null && kind !== "EVENT" && (
          <span className="ml-auto flex-none text-[11.5px] text-dim">
            {frame.gas.toLocaleString()} gas
          </span>
        )}
      </span>
      <span
        className={`relative flex flex-col rounded-card border bg-card-grad transition-[border-color,box-shadow] ${
          selected || dragging
            ? "border-border-strong shadow-float"
            : "border-border shadow-soft group-hover:border-border-strong"
        }`}
      >
        <Port tone="neutral" side="l" />
        {hasOut && <Port tone={frame.ok ? "ok" : "bad"} side="r" />}
        <span
          className="flex items-center gap-2 px-2.5 font-sans text-[12.5px] text-muted"
          style={{ height: HEAD_H }}
        >
          <KindBadge kind={kind} size="sm" />
        </span>
        {rows.length > 0 && (
          <span className="mx-2 mb-2 block rounded-inner border border-border bg-inner-grad py-1">
            {rows.map((r) => (
              <span
                key={r.key}
                className="flex h-7 items-center gap-2.5 whitespace-nowrap px-2.5"
              >
                <span className="text-dim">{r.key}</span>
                <span
                  className={`ml-auto truncate ${r.tone === "ok" ? "text-green" : r.tone === "bad" ? "text-red" : "text-fg"}`}
                >
                  {r.tone === "bad" ? r.value : human(r.value)}
                </span>
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
