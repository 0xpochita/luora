"use client";

import { useEffect, useRef } from "react";
import { Chevron, KindIcon, Meter } from "@/components/ui";
import { displayKind, type Frame, human, splitArgs } from "@/features/trace";

export function TraceRow({
  index,
  frame,
  maxGas,
  order,
  selected,
  onSelect,
}: {
  index: number;
  frame: Frame;
  maxGas: number;
  order: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const kind = displayKind(frame);
  // keyboard stepping keeps the selected call on screen
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      style={{ animationDelay: `${Math.min(order * 35, 900)}ms` }}
      className={`flex min-h-10 w-full animate-rise items-center gap-2.5 whitespace-nowrap rounded-tile py-1 pr-3 pl-1.5 text-left transition-colors ${
        selected
          ? "bg-hover shadow-[inset_2px_0_0_var(--fg)]"
          : kind === "REVERT"
            ? "bg-red/[.05] hover:bg-red/[.09]"
            : "hover:bg-raised"
      }`}
    >
      <span className="w-[22px] flex-none text-right font-mono text-[11.5px] text-muted tabular-nums">
        {index}
      </span>
      <span
        className="tree-guides flex-none self-stretch"
        style={{ width: frame.d * 24 }}
      />
      <KindIcon kind={kind} />
      <span className="font-mono text-[13px]">
        <span className="text-body">{frame.to}</span>
        <span className="mx-px text-muted">.</span>
        <span className="font-semibold text-fg">{frame.fn}</span>
      </span>
      <span className="flex min-w-0 gap-1.5 overflow-hidden">
        {splitArgs(frame.args).map(([k, v]) => (
          <span
            key={k}
            className="whitespace-nowrap rounded-chip border border-white/[.06] bg-raised px-1.5 py-0.5 font-mono text-[11.5px] text-fg"
          >
            <em className="mr-1.5 text-muted not-italic">{k}</em>
            {v}
          </span>
        ))}
      </span>
      {frame.ret && (
        <span
          className={`whitespace-nowrap rounded-chip border px-2 py-0.5 font-mono text-[11.5px] ${
            frame.ok
              ? "border-white/[.06] bg-raised text-text"
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
  );
}
