"use client";

import { Button, Chip } from "@/components/ui";
import { useRun } from "@/features/run";

/** Header badge: says when the app shows sample data or a dropped file, never silently. */
export function DataBadge() {
  const { run, setRun, origin, setPane, setSample } = useRun();

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
    <span className="flex items-center gap-1">
      <Chip tone="warn" dot>
        Sample data
      </Chip>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2"
        onClick={() => {
          setSample(false);
          setPane(null);
        }}
      >
        Use my project
      </Button>
    </span>
  );
}
