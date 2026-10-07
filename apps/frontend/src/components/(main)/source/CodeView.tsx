"use client";

import { useEffect, useMemo, useRef } from "react";
import { tokenize } from "@/features/trace";

export function CodeView({
  source,
  highlight,
}: {
  source: string;
  highlight: [number, number] | null;
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

  useEffect(() => {
    if (!highlight) return;
    const el = ref.current?.children[highlight[0]] as HTMLElement | undefined;
    ref.current?.scrollTo({
      top: (el?.offsetTop ?? 0) - 80,
      behavior: "smooth",
    });
  }, [highlight]);

  return (
    <pre
      ref={ref}
      className="relative flex-1 overflow-auto bg-tray py-2.5 pb-10 font-mono text-xs leading-[1.8]"
    >
      {lines.map((line) => {
        const on =
          highlight && line.n >= highlight[0] && line.n <= highlight[1];
        return (
          <span
            key={line.id}
            className={`block pr-3.5 transition-colors ${on ? "bg-accent/8 shadow-[inset_2px_0_var(--accent)]" : ""}`}
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
          </span>
        );
      })}
    </pre>
  );
}
