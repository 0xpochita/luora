"use client";

import { Tabs, ToggleChip } from "@/components/ui";
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
    <div className="border-line border-b px-5 pt-4">
      <div className="flex items-end gap-3 pb-3">
        <div className="min-w-0">
          <p className="text-dim ui-label">Test / call trace</p>
          <h1 className="mt-1 truncate font-mono font-semibold text-[20px] uppercase leading-tight tracking-[0.04em]">
            {title}
          </h1>
          <p className="mt-1 text-muted text-xs">
            Decoded call trace from your local{" "}
            <code className="font-mono">forge test</code>. Click a frame to jump
            to its source.
          </p>
        </div>
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
      <Tabs
        value={mode}
        onChange={onMode}
        className="pb-3"
        options={[
          { value: "trace", label: "Trace" },
          { value: "graph", label: "Graph" },
        ]}
      />
    </div>
  );
}
