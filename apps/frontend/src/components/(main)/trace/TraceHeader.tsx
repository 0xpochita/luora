"use client";

import { SegmentedControl, ToggleChip } from "@/components/ui";
import type { DisplayKind, TraceMode } from "@/features/trace";

const FILTERS: { kind: DisplayKind; label: string }[] = [
  { kind: "VM", label: "cheatcodes" },
  { kind: "EVENT", label: "events" },
  { kind: "STATICCALL", label: "view calls" },
];

export function TraceHeader({
  title,
  mode,
  onMode,
  hidden,
  onToggle,
}: {
  title: string;
  mode: TraceMode;
  onMode: (m: TraceMode) => void;
  hidden: Set<DisplayKind>;
  onToggle: (k: DisplayKind) => void;
}) {
  return (
    <div className="flex items-end gap-3 px-7 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="truncate font-semibold text-[28px] leading-tight tracking-[-0.035em]">
          {title}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Decoded call trace from your local{" "}
          <code className="font-mono">forge test</code>. Click a frame to jump
          to its source.
        </p>
      </div>
      <div className="ml-auto flex flex-none items-center gap-1.5">
        <SegmentedControl
          value={mode}
          onChange={onMode}
          options={[
            { value: "trace", label: "Trace" },
            { value: "graph", label: "Graph" },
          ]}
        />
        {FILTERS.map((f) => (
          <ToggleChip
            key={f.kind}
            label={f.label}
            on={!hidden.has(f.kind)}
            onToggle={() => onToggle(f.kind)}
          />
        ))}
      </div>
    </div>
  );
}
