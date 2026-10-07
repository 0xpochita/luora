"use client";

import { Tray, TrayCard } from "@/components/ui";
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
    <Tray>
      <TrayCard className="p-2">
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
      </TrayCard>
    </Tray>
  );
}
