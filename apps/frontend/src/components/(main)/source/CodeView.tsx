"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { tokenize } from "@/features/trace";

const NOTE_TONE: Record<string, string> = {
  SLOAD: "bg-raised text-muted",
  SSTORE: "bg-green/10 text-green",
  call: "bg-blue/10 text-blue",
  emit: "bg-violet/10 text-violet",
};

export function CodeView({
  source,
  lines: marked,
  notes,
  bad = [],
  current,
  gutter,
  onLine,
  className = "",
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
  /** click on a line (0-based); lines become pointer targets when set */
  onLine?: (n: number) => void;
  className?: string;
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer shortcut; keyboard users jump via quick search (/)
    <pre
      ref={ref}
      onClick={
        onLine &&
        ((e) => {
          const n = (e.target as HTMLElement).closest<HTMLElement>("[data-n]")
            ?.dataset.n;
          if (n != null && !getSelection()?.toString()) onLine(Number(n));
        })
      }
      className={`relative flex-1 overflow-auto bg-inset py-2.5 pb-10 font-mono text-xs leading-[1.8] ${onLine ? "[&>span]:cursor-pointer [&>span:hover]:bg-hover" : ""} ${className}`}
    >
      {lines.map((line) => (
        <span
          key={line.id}
          data-n={line.n}
          className={`block pr-3.5 transition-colors ${
            line.n === current
              ? red.has(line.n)
                ? "bg-red/20 shadow-[inset_2px_0_var(--red)]"
                : "bg-fg/12 shadow-[inset_2px_0_var(--fg)]"
              : red.has(line.n)
                ? "bg-red/10 shadow-[inset_2px_0_var(--red)]"
                : on.has(line.n)
                  ? "bg-fg/6 shadow-[inset_2px_0_var(--muted)]"
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
              className={`ml-2 select-none rounded-chip px-1.5 py-px font-mono text-[10px] ${NOTE_TONE[tag] ?? "bg-raised text-muted"}`}
            >
              {tag}
            </span>
          ))}
        </span>
      ))}
    </pre>
  );
}
