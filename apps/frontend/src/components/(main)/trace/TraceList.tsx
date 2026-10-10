"use client";

import type { Frame } from "@/features/trace";
import { TraceRow } from "./TraceRow";

/** The call trace rows the toolbar's filters, depth and search let through. */
export function TraceList({
  rows,
  total,
  maxGas,
  filtered,
  selected,
  onSelect,
  onFold,
  onReset,
}: {
  rows: { frame: Frame; index: number; fold: "open" | "closed" | null }[];
  total: number;
  maxGas: number;
  /** a filter, depth or search is on */
  filtered: boolean;
  selected: number | null;
  onSelect: (i: number) => void;
  onFold: (i: number) => void;
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
      </header>
      {rows.length ? (
        <div className="space-y-px">
          {rows.map(({ frame, index, fold }) => (
            <TraceRow
              key={index}
              index={index}
              frame={frame}
              maxGas={maxGas}
              selected={selected === index}
              onSelect={() => onSelect(index)}
              fold={fold}
              onFold={() => onFold(index)}
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
