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
    <div>
      {[...suites].map(([suite, items]) => (
        <section key={suite}>
          <h3 className="flex px-1 pt-3 pb-1.5 text-dim hud-label">
            {suite}
            <span className="ml-auto">{items.length}</span>
          </h3>
          {items.map(([t, i]) => {
            const pass = t.status === "Success";
            const on = i === selected;
            return (
              <button
                key={`${t.suite}:${t.name}`}
                type="button"
                onClick={() => onSelect(i)}
                className={`flex w-full items-center gap-2 border-l-2 px-2.5 py-1.5 text-left font-mono text-[12px] transition-colors ${
                  on
                    ? "border-accent bg-sel text-ink"
                    : "border-transparent text-muted hover:bg-sel/60 hover:text-ink"
                }`}
              >
                <span
                  className={`size-1.5 flex-none ${pass ? "bg-ok" : "bg-bad"}`}
                />
                <span className="truncate">{t.name}</span>
                <small className="ml-auto text-dim hud-label">
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
