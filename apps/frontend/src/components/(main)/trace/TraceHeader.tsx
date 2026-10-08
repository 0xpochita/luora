"use client";

import { Tabs, ToggleChip } from "@/components/ui";
import type { DisplayKind, TraceMode } from "@/features/trace";

const FILTERS: { kind: DisplayKind; label: string }[] = [
  { kind: "VM", label: "Cheatcodes" },
  { kind: "EVENT", label: "Events" },
  { kind: "STATICCALL", label: "View calls" },
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
    <div className="flex-none px-5 pt-4 pb-3">
      <p className="text-dim ui-label">Test call trace</p>
      <h1 className="mt-1 truncate font-medium font-mono text-[18px] text-fg leading-tight">
        {title}
      </h1>
      <p className="mt-1 text-[13px] text-muted">
        Decoded call trace from your local{" "}
        <code className="font-mono text-xs">forge test</code>. Click a frame to
        jump to its source.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Tabs
          value={mode}
          onChange={onMode}
          size="sm"
          options={[
            { value: "trace", label: "Trace" },
            { value: "graph", label: "Graph" },
          ]}
        />
        <div className="ml-auto flex flex-none items-center gap-1.5">
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
    </div>
  );
}
