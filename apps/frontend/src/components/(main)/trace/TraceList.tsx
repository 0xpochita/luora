"use client";

import { type DisplayKind, displayKind, type Frame } from "@/features/trace";
import { TraceRow } from "./TraceRow";

export function TraceList({
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
  const maxGas = Math.max(1, ...frames.map((f) => f.gas ?? 0));
  const visible = frames
    .map((frame, index) => ({ frame, index }))
    .filter(({ frame }) => !hidden.has(displayKind(frame)));
  return (
    <section>
      <header className="flex items-center px-1 pb-1.5 text-[13px]">
        <span className="text-fg">Frames</span>
        <span className="ml-auto font-mono text-dim text-xs">
          {visible.length} / {frames.length}
        </span>
      </header>
      <div className="space-y-0.5">
        {visible.map(({ frame, index }, order) => (
          <TraceRow
            key={index}
            index={index}
            frame={frame}
            maxGas={maxGas}
            order={order}
            selected={selected === index}
            onSelect={() => onSelect(index)}
          />
        ))}
      </div>
    </section>
  );
}
