"use client";

import { useEffect, useState } from "react";
import type { AtlasModel } from "../utils/model";

const STEP_MS = 1300;

/**
 * Step-by-step replay of what an entry point touches (`model.seq`), for the selected entry.
 * Resets whenever the selection changes; step -1 = not started.
 */
export function useCitySim(model: AtlasModel, selected: string | null) {
  const entry = selected && model.seq[selected]?.length ? selected : null;
  const [state, setState] = useState({ entry, step: -1, playing: false });
  const { step, playing } =
    state.entry === entry ? state : { step: -1, playing: false };
  const steps = entry ? model.seq[entry] : [];
  const last = steps.length - 1;

  const go = (next: number, play: boolean) =>
    setState({ entry, step: Math.min(next, last), playing: play });

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(
      () => setState({ entry, step: step + 1, playing: step + 1 < last }),
      step < 0 ? 0 : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [entry, step, playing, last]);

  return {
    entry,
    steps,
    step,
    playing,
    late: entry ? model.lateWrites(entry) : [],
    lines: entry ? model.stepLines(entry) : [],
    play: () => go(step >= last ? -1 : step, true),
    pause: () => go(step, false),
    next: () => go(step + 1, false),
    seek: (i: number) => go(i, false),
    reset: () => go(-1, false),
  };
}

export type CitySim = ReturnType<typeof useCitySim>;
