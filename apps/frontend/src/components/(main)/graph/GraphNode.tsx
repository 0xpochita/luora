"use client";

import { KindIcon } from "@/components/ui";
import { displayKind, type Frame, frameRows, human } from "@/features/trace";

export const NODE_W = 320;
/** Card height from its row count, so layout never has to measure the DOM. */
export function nodeHeight(f: Frame): number {
  const rows = frameRows(f).length;
  return 58 + (rows ? rows * 29 + 10 : 0);
}

export function GraphNode({
  frame,
  x,
  y,
  order,
  selected,
  dragging = false,
  onSelect,
  onDragStart,
}: {
  frame: Frame;
  x: number;
  y: number;
  order: number;
  selected: boolean;
  dragging?: boolean;
  onSelect: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
}) {
  const kind = displayKind(frame);
  const rows = frameRows(frame);
  return (
    <button
      type="button"
      data-no-pan
      onClick={onSelect}
      onPointerDown={onDragStart}
      style={{
        left: x,
        top: y,
        width: NODE_W,
        animationDelay: `${Math.min(order * 30, 700)}ms`,
      }}
      className={`absolute animate-pop touch-none select-none border bg-panel ${dragging ? "z-10 cursor-grabbing shadow-[0_12px_32px_rgba(0,0,0,.6)]" : "cursor-grab"} p-1.5 text-left font-mono text-xs transition-colors ${
        selected
          ? "border-accent"
          : frame.ok
            ? "border-line hover:border-edge"
            : "border-bad/70"
      }`}
    >
      <div className="flex items-center gap-2 px-2 pt-2 pb-2.5">
        <KindIcon kind={kind} size="lg" />
        <div className="flex min-w-0 flex-col">
          <b className="truncate font-semibold text-[13px]">
            <span className="font-normal text-muted">{frame.to}</span>.
            {frame.fn}
          </b>
          <span className="text-[9.5px] text-dim ui-label">{kind}</span>
        </div>
        {frame.gas != null && kind !== "EVENT" && (
          <span className="ml-auto flex-none whitespace-nowrap border border-line px-1.5 py-px text-[10px] text-dim">
            {frame.gas.toLocaleString()} gas
          </span>
        )}
      </div>
      {rows.length > 0 && (
        <div className="divide-y divide-line border border-line bg-tray py-0.5">
          {rows.map((r) => (
            <div
              key={r.key}
              className="flex gap-2.5 whitespace-nowrap px-3 py-1.5"
            >
              <span className="text-dim uppercase tracking-[0.1em]">
                {r.key}
              </span>
              <span
                className={`ml-auto truncate ${r.tone === "ok" ? "text-ok" : r.tone === "bad" ? "text-bad" : "text-ink"}`}
              >
                {r.tone === "bad" ? r.value : human(r.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
