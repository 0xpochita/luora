"use client";

import { PH, PhIcon } from "@/components/ui";
import { useRun } from "@/features/run";

/** Header button that reopens the first session (RunDialog); hidden on the Start page, which is the onboarding. */
export function GuideButton() {
  const { setPane, origin } = useRun();
  if (!origin || origin === "none") return null;
  return (
    <button
      type="button"
      onClick={() => setPane("welcome")}
      className="hdr-pill"
    >
      <PhIcon d={PH.compass} className="size-[15px] text-muted" />
      Get started
    </button>
  );
}
