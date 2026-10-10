"use client";

import { Chip } from "@/components/ui";
import { useRun } from "@/features/run";

/** Header button that reopens the first session (RunDialog) at its welcome step. */
export function GuideButton() {
  const { setPane } = useRun();
  return (
    <button
      type="button"
      onClick={() => setPane("welcome")}
      className="group rounded-chip outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      <Chip className="group-hover:bg-hover group-hover:text-fg">
        Get started
      </Chip>
    </button>
  );
}
