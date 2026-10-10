"use client";

import { type TestResult, testKind } from "@/features/trace";

export function TestList({
  tests,
  selected,
  onSelect,
}: {
  tests: TestResult[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const suites = new Map<string, [TestResult, number][]>();
  for (const [i, t] of tests.entries()) {
    suites.set(t.suite, [...(suites.get(t.suite) ?? []), [t, i]]);
  }
  return (
    <div className="space-y-3">
      {[...suites].map(([suite, items]) => (
        <section key={suite} className="space-y-0.5">
          <h3 className="flex px-2.5 pb-1 text-dim ui-label">
            {suite}
            <span className="ml-auto font-mono">{items.length}</span>
          </h3>
          {items.map(([t, i]) => {
            const pass = t.status === "Success";
            const on = i === selected;
            return (
              <button
                key={`${t.suite}:${t.name}`}
                type="button"
                onClick={() => onSelect(i)}
                aria-current={on || undefined}
                className={`flex h-8 w-full items-center gap-2.5 rounded-tile px-2.5 text-left font-mono text-[12px] transition-colors ${
                  on
                    ? "bg-raised text-fg"
                    : "text-muted hover:bg-raised/60 hover:text-fg"
                }`}
              >
                <span
                  className={`size-1.5 flex-none rounded-full ${pass ? "bg-green" : t.status === "Skipped" ? "bg-dim" : "bg-red"}`}
                />
                <span className="truncate">{t.name}</span>
                <small className="ml-auto font-sans text-[11px] text-dim">
                  {testKind(t.kind)}
                </small>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
