"use client";

import { useEffect, useMemo, useRef } from "react";
import { tokenize } from "@/features/trace";

const NOTE_TONE: Record<string, string> = {
  SLOAD: "bg-sky",
  SSTORE: "bg-peach",
  call: "bg-lilac",
  emit: "bg-butter",
};

export function CodeView({
  source,
  lines: marked,
  notes,
}: {
  source: string;
  /** 0-based lines to highlight. */
  lines: number[];
  /** 0-based line → tags shown at the end of the line. */
  notes?: Record<number, string[]>;
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
  const first = marked[0] ?? Number(Object.keys(notes ?? {})[0] ?? -1);

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
      className="relative mx-2.5 mb-2.5 flex-1 overflow-auto rounded-3xl border-[1.5px] border-trayline bg-tray py-2.5 pb-10 font-mono text-xs leading-[1.8]"
    >
      {lines.map((line) => (
        <span
          key={line.id}
          className={`block pr-3.5 transition-colors ${on.has(line.n) ? "bg-accent/11 shadow-[inset_3px_0_var(--accent)]" : ""}`}
        >
          <span className="inline-block w-[42px] select-none pr-3.5 text-right text-dim">
            {line.n + 1}
          </span>
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
              className={`ml-2 select-none rounded-full px-1.5 py-px font-sans text-[10px] text-ink ${NOTE_TONE[tag] ?? "bg-soft"}`}
            >
              {tag}
            </span>
          ))}
        </span>
      ))}
    </pre>
  );
}
