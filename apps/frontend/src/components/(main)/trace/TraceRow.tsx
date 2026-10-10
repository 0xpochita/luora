"use client";

import { motion } from "motion/react";
import { Fragment, useEffect, useRef } from "react";
import { Chevron, EASE, KindBadge, Meter } from "@/components/ui";
import { displayKind, type Frame, human, splitArgs } from "@/features/trace";

/*
 * One call, written the way Phalcon Explorer's invocation flow writes it (docs/ux/trace-view.md):
 * a fold box for calls that have children, the kind as an outlined word, then the call as code,
 * Contract.fn(name=value, …), and its return in a box of its own. Compact rows, so a long
 * trace fits; reverts tinted; the selected row carries a bar on its left edge.
 * The whole row selects, Shift-click takes every call up to it (GitHub's line numbers), and the
 * row last clicked carries an Ask AI pill in the row's empty middle (GitHub's Copilot button,
 * right of the selection), so asking never moves the gas column.
 */
export function TraceRow({
  index,
  frame,
  maxGas,
  selected,
  inRange,
  onSelect,
  fold,
  onFold,
  ask,
  onAsk,
}: {
  index: number;
  frame: Frame;
  maxGas: number;
  selected: boolean;
  /** inside a Shift-click range, but not the row last clicked */
  inRange: boolean;
  onSelect: (extend: boolean) => void;
  /** open / closed when the call has children, null otherwise */
  fold: "open" | "closed" | null;
  onFold: () => void;
  /** the Ask AI pill's label; set on the row last clicked only */
  ask: string | null;
  onAsk: () => void;
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
      className={`relative flex min-h-[34px] items-center gap-2 rounded-tile pr-2 pl-1 transition-colors ${
        selected
          ? "bg-hover shadow-[inset_2px_0_0_var(--fg)]"
          : inRange
            ? "bg-white/[.045] shadow-[inset_2px_0_0_rgb(255_255_255/.35)]"
            : kind === "REVERT"
              ? "bg-red/[.05] hover:bg-red/[.09]"
              : "hover:bg-raised"
      }`}
    >
      <button
        type="button"
        onClick={(e) => onSelect(e.shiftKey)}
        // Shift-click selects calls, not the page's text
        onMouseDown={(e) => e.shiftKey && e.preventDefault()}
        aria-current={selected || undefined}
        aria-label={`Call ${index}: ${frame.to}.${frame.fn}`}
        className="absolute inset-0 rounded-tile outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      />
      <span className="pointer-events-none w-[26px] flex-none text-right font-mono text-[11.5px] text-muted tabular-nums">
        {index}
      </span>
      <span
        className="tree-guides pointer-events-none flex-none self-stretch"
        style={{ width: frame.d * 20 }}
      />
      {/* Phalcon's fold box: written, not drawn */}
      {fold ? (
        <button
          type="button"
          onClick={onFold}
          aria-expanded={fold === "open"}
          aria-label={fold === "open" ? "Fold this call" : "Unfold this call"}
          className="relative z-10 grid size-4 flex-none place-items-center rounded-[4px] border border-white/20 font-mono text-[11px] text-muted leading-none hover:border-white/40 hover:text-fg"
        >
          {fold === "open" ? "−" : "+"}
        </button>
      ) : (
        <span className="w-4 flex-none" />
      )}
      <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-2.5 whitespace-nowrap py-1">
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
        {ask && (
          <motion.button
            type="button"
            onClick={onAsk}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
            title="Ask AI about the selected calls  A"
            className="pointer-events-auto relative z-10 flex h-6 flex-none items-center rounded-full bg-primary px-2.5 font-medium text-[11.5px] text-primary-fg transition-colors hover:bg-white"
          >
            {ask}
          </motion.button>
        )}
        {/* fixed columns under the list's Line / Gas used headers; empty cells keep them lined up */}
        <span className="ml-auto flex flex-none items-center gap-2 pl-3.5">
          <span
            title={
              frame.callSite
                ? `${frame.callSite.file}:${frame.callSite.line}`
                : undefined
            }
            className="w-10 text-right font-mono text-[11.5px] text-muted tabular-nums"
          >
            {frame.callSite && `L${frame.callSite.line}`}
          </span>
          {frame.gas != null && kind !== "EVENT" ? (
            <>
              <Meter value={frame.gas / maxGas} />
              <span className="w-[54px] text-right font-mono text-[11.5px] text-body tabular-nums">
                {frame.gas.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="w-[126px]" />
          )}
        </span>
      </span>
    </div>
  );
}
