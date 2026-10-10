"use client";

import { Button, Chip } from "@/components/ui";
import { useRun } from "@/features/run";

/** Header badge: says when the app shows sample data or a dropped file, never silently. */
export function DataBadge() {
  const { run, setRun, origin, setPane } = useRun();

  if (run)
    return (
      <span className="flex items-center gap-1" title="Loaded in this tab only">
        <Chip dot className="max-w-56">
          <span className="truncate">{run.name}</span>
        </Chip>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2"
          onClick={() => setRun(null)}
        >
          Unload
        </Button>
      </span>
    );
  if (origin !== "sample") return null;
  return (
    <button
      type="button"
      onClick={() => setPane("project")}
      className="group rounded-chip outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      <Chip
        tone="warn"
        dot
        className="group-hover:bg-hover group-hover:text-fg"
      >
        Sample data
        <span className="text-dim">· Use my project</span>
      </Chip>
    </button>
  );
}
