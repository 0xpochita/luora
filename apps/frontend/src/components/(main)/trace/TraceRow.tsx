"use client";

import { KindIcon } from "@/components/ui";
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
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(order * 35, 900)}ms` }}
      className={`flex min-h-11 w-full animate-rise items-center gap-2.5 whitespace-nowrap rounded-2xl py-1 pr-3 pl-1.5 text-left transition-colors ${
        selected ? "bg-sel" : frame.ok ? "hover:bg-soft" : "bg-bad/7"
      }`}
    >
      <span className="w-[22px] flex-none text-right font-mono text-[11px] text-dim">
        {index}
      </span>
      <span
        className="tree-guides flex-none self-stretch"
        style={{ width: frame.d * 24 }}
      />
      <KindIcon kind={kind} />
      <span className="font-mono text-[13px]">
        <span className="font-medium text-contract">{frame.to}</span>
        <span className="mx-px text-dim">.</span>
        <span className="font-semibold">{frame.fn}</span>
      </span>
      <span className="flex min-w-0 gap-1.5 overflow-hidden">
        {splitArgs(frame.args).map(([k, v]) => (
          <span
            key={k}
            className="whitespace-nowrap rounded-xl bg-soft px-2 py-1 font-mono text-[11.5px]"
          >
            <em className="mr-1.5 text-muted not-italic">{k}</em>
            {v}
          </span>
        ))}
      </span>
      {frame.ret && (
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-1 font-medium font-mono text-[11.5px] ${
            frame.ok ? "bg-ok/13 text-ok" : "bg-bad/13 text-bad"
          }`}
        >
          {frame.ok ? `→ ${human(frame.ret)}` : `✕ ${frame.ret}`}
        </span>
      )}
      <span className="ml-auto flex flex-none items-center gap-2 pl-3.5">
        {frame.callSite && (
          <span
            title={`${frame.callSite.file}:${frame.callSite.line}`}
            className="font-mono text-[11px] text-dim"
          >
            L{frame.callSite.line}
          </span>
        )}
        {frame.gas != null && kind !== "EVENT" && (
          <>
            <i className="block h-1.5 w-16 overflow-hidden rounded-full bg-soft">
              <b
                className="block h-full rounded-full bg-linear-to-r from-[#b9d8ff] to-accent"
                style={{ width: `${Math.max(2, (frame.gas / maxGas) * 100)}%` }}
              />
            </i>
            <span className="min-w-[54px] text-right font-mono text-[11px] text-dim">
              {frame.gas.toLocaleString()}
            </span>
          </>
        )}
      </span>
    </button>
  );
}
