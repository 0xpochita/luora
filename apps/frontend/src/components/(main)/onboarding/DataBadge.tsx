"use client";

import { Button, Chip } from "@/components/ui";
import { useRun } from "@/features/run";
import { PH, PhIcon } from "./ph";

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
  return (
    <span className="flex items-center gap-1.5">
      {run ? (
        <span title="Read in this tab only, never uploaded">
          <Chip tone="ok" dot className="max-w-64">
            <span className="text-muted">Viewing</span>
            <span className="truncate font-mono text-fg">{run.name}</span>
          </Chip>
        </span>
      ) : (
        <Chip tone="warn" dot>
          <span className="text-muted">Viewing</span>
          <span className="text-fg">Sample data</span>
        </Chip>
      )}
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5 border border-border-strong px-2.5"
        title="Unload and go back to the Start here page"
        onClick={reset}
      >
        <PhIcon d={PH.reset} className="size-[13px]" />
        Reset
      </Button>
    </span>
  );
}
