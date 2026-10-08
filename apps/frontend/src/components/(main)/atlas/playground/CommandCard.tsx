"use client";

import { useEffect } from "react";
import type { AtlasModel } from "@/features/atlas";
import type { Playground } from "@/features/atlas/hooks/usePlayground";

type Cmd = {
  key: string;
  label: string;
  sub?: string;
  run: () => void;
  off?: boolean;
  on?: boolean;
};

/** RTS command card: square actions with hotkeys for the token and the selected building. */
export function CommandCard({
  model,
  pg,
  selected,
}: {
  model: AtlasModel;
  pg: Playground;
  selected: string | null;
}) {
  const sel = selected ? model.byId[selected] : null;
  const target = sel && sel.sys !== "vulns" ? sel.id : null;
  const tests = target ? pg.tracesOf(target) : [];
  const cmds: Cmd[] = [
    {
      key: "C",
      label: model.entry.includes(target ?? "") ? "Call" : "Inspect",
      sub: sel?.name,
      run: () => pg.drop(target),
      off: !target,
    },
    {
      key: "P",
      label: "Pick token",
      run: () => pg.setArmed(!pg.armed),
      on: pg.armed,
    },
    {
      key: "R",
      label: "Caller",
      sub: pg.caller,
      run: pg.cycleCaller,
    },
    {
      key: "A",
      label: "Amount",
      sub: pg.amountLabel,
      run: () => document.getElementById("pg-amount")?.focus(),
    },
    {
      key: "T",
      label: "Test values",
      sub: pg.trace?.key ?? (tests.length ? `${tests.length} test(s)` : "none"),
      run: () => {
        const i = tests.findIndex((c) => c.key === pg.traceTest);
        pg.setTraceTest(i + 1 < tests.length ? tests[i + 1].key : null);
        if (target && !pg.active) pg.drop(target);
      },
      off: !tests.length,
      on: !!pg.trace,
    },
    {
      key: "X",
      label: "Reset",
      run: pg.reset,
      off: !pg.active && !pg.armed,
    },
  ];

  const byKey = Object.fromEntries(cmds.map((c) => [c.key.toLowerCase(), c]));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        t?.closest("input, select, textarea, [contenteditable]")
      )
        return;
      const c = byKey[e.key.toLowerCase()];
      if (!c || c.off) return;
      e.preventDefault();
      c.run();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="pg-cmd grid grid-cols-3 gap-1 border border-line bg-shell/90 p-1.5"
      role="toolbar"
      aria-label="Playground commands"
    >
      {cmds.map((c) => (
        <button
          type="button"
          key={c.key}
          disabled={c.off}
          aria-pressed={c.on}
          aria-keyshortcuts={c.key}
          onClick={c.run}
          title={`${c.label}${c.sub ? ` · ${c.sub}` : ""} (${c.key})`}
          className={c.on ? "on" : ""}
        >
          <kbd>{c.key}</kbd>
          <span className="hud-label">{c.label}</span>
          {c.sub && <small>{c.sub}</small>}
        </button>
      ))}
    </div>
  );
}
