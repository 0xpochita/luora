"use client";

import { useEffect, useRef, useState } from "react";
import { PH, PhIcon } from "@/components/ui";
import type { RunScope } from "@/features/run/utils/test-run";

type T = { suite: string; name: string };
const keyOf = (t: T) => `${t.suite}.${t.name}`;

/**
 * Start test's "Choose tests…": the run's tests by contract, each a checkbox (VS Code's Test
 * Explorer picks tests the same way), All / None per list, then Start N tests. The Connect AI
 * dialog's <dialog> and motion.
 */
export function TestChooser({
  open,
  tests,
  chosen,
  onClose,
  onStart,
}: {
  open: boolean;
  tests: T[];
  chosen: RunScope;
  onClose: () => void;
  onStart: (scope: RunScope) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [on, setOn] = useState<Set<string>>(new Set());
  useEffect(() => {
    const d = dialog.current;
    if (open && !d?.open) {
      setOn(new Set(chosen.map(keyOf)));
      d?.showModal();
    }
    if (!open && d?.open) d.close();
  }, [open, chosen]);

  const suites = [...new Set(tests.map((t) => t.suite))];
  const flip = (k: string) =>
    setOn((s) => {
      const n = new Set(s);
      if (!n.delete(k)) n.add(k);
      return n;
    });
  const picked = tests.filter((t) => on.has(keyOf(t)));

  return (
    <dialog
      ref={dialog}
      aria-label="Choose tests"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      onKeyDown={(e) => e.stopPropagation()}
      className="ai-dialog m-auto max-h-[min(640px,calc(100dvh-48px))] w-[min(480px,calc(100vw-32px))] overflow-hidden rounded-card border border-border bg-card-grad p-0 text-fg shadow-float open:flex open:flex-col"
    >
      <header className="flex flex-none items-center gap-2 border-border border-b px-4 py-3">
        <span className="font-medium text-[14px]">Choose tests</span>
        <span className="text-[12.5px] text-dim">
          {picked.length} of {tests.length}
        </span>
        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            className="hdr-pill sm"
            onClick={() => setOn(new Set(tests.map(keyOf)))}
          >
            All
          </button>
          <button
            type="button"
            className="hdr-pill sm"
            onClick={() => setOn(new Set())}
          >
            None
          </button>
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-auto py-1.5">
        {suites.map((suite) => (
          <fieldset key={suite} className="pb-1.5">
            <legend className="px-4 pt-1.5 pb-1 text-[11.5px] text-dim">
              {suite}
            </legend>
            {tests
              .filter((t) => t.suite === suite)
              .map((t) => (
                <label
                  key={keyOf(t)}
                  className="flex cursor-pointer items-center gap-2.5 px-4 py-1.5 transition-colors hover:bg-raised"
                >
                  <input
                    type="checkbox"
                    checked={on.has(keyOf(t))}
                    onChange={() => flip(keyOf(t))}
                    className="size-3.5 flex-none accent-[#4ade80]"
                  />
                  <span className="truncate font-mono text-[12.5px] text-fg">
                    {t.name}
                  </span>
                </label>
              ))}
          </fieldset>
        ))}
      </div>
      <footer className="flex flex-none items-center justify-end gap-1.5 border-border border-t px-4 py-3">
        <button type="button" className="hdr-pill sm" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="hdr-pill sm go"
          disabled={!picked.length}
          onClick={() => onStart(picked)}
        >
          <PhIcon d={PH.play} className="size-[14px] text-green" />
          Start {picked.length} {picked.length === 1 ? "test" : "tests"}
        </button>
      </footer>
    </dialog>
  );
}
