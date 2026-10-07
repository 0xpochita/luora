"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { tokenize } from "@/features/trace";

const NOTE_TONE: Record<string, string> = {
  SLOAD: "border border-edge text-muted",
  SSTORE: "border border-tick text-ink",
  call: "bg-soft text-ink",
  emit: "border border-dashed border-edge text-muted",
};

export function CodeView({
  source,
  lines: marked,
  notes,
  bad = [],
  current,
  gutter,
}: {
  source: string;
  /** 0-based lines to highlight. */
  lines: number[];
  /** 0-based lines marked red (findings). */
  bad?: number[];
  /** 0-based line in focus right now (scrolled to, strongest highlight). */
  current?: number;
  /** 0-based line → tags shown at the end of the line. */
  notes?: Record<number, string[]>;
  /** extra gutter cell after the line number (e.g. test coverage hits), by 0-based line */
  gutter?: (line: number) => ReactNode;
}) {
  const ref = useRef<HTMLPreElement>(null);
  // Lines/tokens are positional; give them stable ids up front.
  const lines = useMemo(
    () =>
      source.split("\n").map((text, n) => ({
        id: `L${n + 1}`,
        n,
        tokens: tokenize(text).map((t, k) => ({ ...t, id: `L${n + 1}:${k}` })),
        empty: text === "",
      })),
    [source],
  );
  const on = new Set(marked);
  const red = new Set(bad);
  const first =
    current ?? marked[0] ?? Number(Object.keys(notes ?? {})[0] ?? -1);

  useEffect(() => {
    if (first < 0) return;
    const el = ref.current?.children[first] as HTMLElement | undefined;
    ref.current?.scrollTo({
      top: (el?.offsetTop ?? 0) - 80,
      behavior: "smooth",
    });
  }, [first]);

  return (
    <pre
      ref={ref}
      className="relative flex-1 overflow-auto bg-tray py-2.5 pb-10 font-mono text-xs leading-[1.8]"
    >
      {lines.map((line) => (
        <span
          key={line.id}
          className={`block pr-3.5 transition-colors ${
            line.n === current
              ? red.has(line.n)
                ? "bg-bad/25 shadow-[inset_3px_0_var(--bad)]"
                : "bg-accent/20 shadow-[inset_3px_0_var(--accent)]"
              : red.has(line.n)
                ? "bg-bad/12 shadow-[inset_2px_0_var(--bad)]"
                : on.has(line.n)
                  ? "bg-accent/8 shadow-[inset_2px_0_var(--accent)]"
                  : ""
          }`}
        >
          <span className="inline-block w-[42px] select-none pr-3.5 text-right text-dim">
            {line.n + 1}
          </span>
          {gutter?.(line.n)}
          {line.tokens.map((t) => (
            <span
              key={t.id}
              className={t.type === "plain" ? undefined : `tok-${t.type}`}
            >
              {t.text}
            </span>
          ))}
          {line.empty && " "}
          {notes?.[line.n]?.map((tag) => (
            <span
              key={tag}
              className={`ml-2 select-none px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider ${NOTE_TONE[tag] ?? "bg-soft"}`}
            >
              {tag}
            </span>
          ))}
        </span>
      ))}
    </pre>
  );
}
