"use client";

import { KIND_META } from "@/components/ui";
import type { DisplayKind, Frame } from "@/features/trace";
import { TraceRow } from "./TraceRow";

const LEGEND: DisplayKind[] = ["CALL", "STATICCALL", "EVENT", "VM", "REVERT"];
const SHORT: Partial<Record<DisplayKind, string>> = {
  CALL: "Call",
  STATICCALL: "View",
  EVENT: "Event",
  VM: "Cheatcode",
  REVERT: "Revert",
};

/** The call trace rows the toolbar's filters, depth and search let through. */
export function TraceList({
  rows,
  total,
  maxGas,
  filtered,
  selected,
  onSelect,
  onReset,
}: {
  rows: { frame: Frame; index: number }[];
  total: number;
  maxGas: number;
  /** a filter, depth or search is on */
  filtered: boolean;
  selected: number | null;
  onSelect: (i: number) => void;
  onReset: () => void;
}) {
  return (
    <section>
      <header className="flex items-center gap-3 px-1 pb-1.5 text-[13px]">
        <span className="text-fg">Calls</span>
        <span className="font-mono text-muted text-xs">
          {rows.length === total
            ? `${total}`
            : `${rows.length} of ${total} shown`}
        </span>
        {filtered && rows.length < total && (
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Show all
          </button>
        )}
        {/* the colour key, in Foundry's own palette (KindIcon) */}
        <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          {LEGEND.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${KIND_META[k].dot}`} />
              {SHORT[k]}
            </span>
          ))}
        </span>
      </header>
      {rows.length ? (
        <div className="space-y-0.5">
          {rows.map(({ frame, index }, order) => (
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
      ) : (
        <div className="mt-2 rounded-inner border border-border border-dashed px-4 py-6 text-center text-[13px] text-muted">
          No call matches.{" "}
          <button
            type="button"
            onClick={onReset}
            className="text-fg underline-offset-2 hover:underline"
          >
            Clear search and filters
          </button>
        </div>
      )}
    </section>
  );
}
