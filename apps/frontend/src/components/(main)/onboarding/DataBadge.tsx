"use client";

import { PH, PhIcon } from "@/components/ui";
import { useRun } from "@/features/run";

/**
 * Header badge: says what the app shows when it is a dropped file or the sample, never silently,
 * with a Reset that puts the app back to its default (nothing loaded, the Start here page). A run
 * read from LUORA_DATA_PATH has no badge: it is the app's own setting, not something to reset here.
 */
export function DataBadge() {
  const { run, setRun, origin, setPane, setSample } = useRun();
  if (!run && origin !== "sample") return null;

  const reset = () => {
    setRun(null);
    setSample(false);
    setPane(null);
  };
  // T2 / T3: one capsule, what is shown on the left, its Reset inside on the right
  return (
    <span className="hdr-pill split">
      <span
        title={run ? "Read in this tab only, never uploaded" : undefined}
        className="max-w-72"
      >
        <span
          className={`hdr-dot ${run ? "text-green" : "text-yellow"}`}
          aria-hidden="true"
        />
        <span className="text-dim">Viewing</span>
        <span
          className={`truncate text-fg ${run ? "font-mono text-[12.5px]" : ""}`}
        >
          {run ? run.name : "Sample data"}
        </span>
      </span>
      <button
        type="button"
        title="Unload and go back to the Start here page"
        onClick={reset}
      >
        <PhIcon d={PH.reset} className="size-[14px]" />
        Reset
      </button>
    </span>
  );
}
