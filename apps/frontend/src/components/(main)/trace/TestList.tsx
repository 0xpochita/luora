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
          <h3 className="px-2.5 pt-3.5 pb-1.5 font-medium text-muted text-xs">
            {suite}
          </h3>
          {items.map(([t, i]) => {
            const pass = t.status === "Success";
            return (
              <button
                key={`${t.suite}:${t.name}`}
                type="button"
                onClick={() => onSelect(i)}
                className={`my-0.5 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left font-mono text-[12.5px] transition-colors ${
                  i === selected ? "bg-sel font-medium" : "hover:bg-sel/70"
                }`}
              >
                <span
                  className={`size-2 flex-none rounded-full ${pass ? "bg-ok ring-3 ring-ok/20" : "bg-bad ring-3 ring-bad/20"}`}
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
