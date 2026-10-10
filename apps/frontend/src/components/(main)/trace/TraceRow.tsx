"use client";

import { Fragment, useEffect, useRef } from "react";
import { Chevron, KindBadge, Meter } from "@/components/ui";
import { displayKind, type Frame, human, splitArgs } from "@/features/trace";

/*
 * One call, written the way Phalcon Explorer's invocation flow writes it (docs/ux/trace-view.md):
 * a fold box for calls that have children, the kind as an outlined word, then the call as code,
 * Contract.fn(name=value, …), and its return in a box of its own. Compact rows, so a long
 * trace fits; reverts tinted; the selected row carries a bar on its left edge.
 */
export function TraceRow({
  index,
  frame,
  maxGas,
  selected,
  onSelect,
  fold,
  onFold,
}: {
  index: number;
  frame: Frame;
  maxGas: number;
  selected: boolean;
  onSelect: () => void;
  /** open / closed when the call has children, null otherwise */
  fold: "open" | "closed" | null;
  onFold: () => void;
}) {
  const kind = displayKind(frame);
  const args = splitArgs(frame.args);
  // keyboard stepping keeps the selected call on screen
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <div
      ref={ref}
      className={`flex min-h-[34px] items-center gap-2 rounded-tile pr-2 pl-1 transition-colors ${
        selected
          ? "bg-hover shadow-[inset_2px_0_0_var(--fg)]"
          : kind === "REVERT"
            ? "bg-red/[.05] hover:bg-red/[.09]"
            : "hover:bg-raised"
      }`}
    >
      <span className="w-[26px] flex-none text-right font-mono text-[11.5px] text-muted tabular-nums">
        {index}
      </span>
      <span
        className="tree-guides flex-none self-stretch"
        style={{ width: frame.d * 20 }}
      />
      {/* Phalcon's fold box: written, not drawn */}
      {fold ? (
        <button
          type="button"
          onClick={onFold}
          aria-expanded={fold === "open"}
          aria-label={fold === "open" ? "Fold this call" : "Unfold this call"}
          className="grid size-4 flex-none place-items-center rounded-[4px] border border-white/20 font-mono text-[11px] text-muted leading-none hover:border-white/40 hover:text-fg"
        >
          {fold === "open" ? "−" : "+"}
        </button>
      ) : (
        <span className="w-4 flex-none" />
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 whitespace-nowrap py-1 text-left"
      >
        <KindBadge kind={kind} />
        <span
          title={`${frame.to}.${frame.fn}(${frame.args})`}
          className="min-w-0 truncate font-mono text-[12.5px]"
        >
          <span className="text-body">{frame.to}</span>
          <span className="text-muted">.</span>
          <span className="font-semibold text-fg">{frame.fn}</span>
          <span className="text-muted">(</span>
          {args.map(([k, v], i) => (
            <Fragment key={k}>
              <span className="text-muted">{k}=</span>
              <span className="text-text">{v}</span>
              {i < args.length - 1 && <span className="text-muted">, </span>}
            </Fragment>
          ))}
          <span className="text-muted">)</span>
        </span>
        {frame.ret && (
          <span
            className={`flex-none rounded-chip border px-2 py-0.5 font-mono text-[11.5px] ${
              frame.ok
                ? "border-white/[.08] bg-raised text-text"
                : "border-red/25 bg-red/[.08] text-red"
            }`}
          >
            {frame.ok ? (
              <>
                <Chevron /> {human(frame.ret)}
              </>
            ) : (
              `✕ ${frame.ret}`
            )}
          </span>
        )}
        <span className="ml-auto flex flex-none items-center gap-2 pl-3.5">
          {frame.callSite && (
            <span
              title={`${frame.callSite.file}:${frame.callSite.line}`}
              className="font-mono text-[11.5px] text-muted tabular-nums"
            >
              L{frame.callSite.line}
            </span>
          )}
          {frame.gas != null && kind !== "EVENT" && (
            <>
              <Meter value={frame.gas / maxGas} />
              <span className="min-w-[54px] text-right font-mono text-[11.5px] text-body tabular-nums">
                {frame.gas.toLocaleString()}
              </span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
