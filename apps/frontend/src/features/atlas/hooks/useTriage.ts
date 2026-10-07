"use client";

import { useEffect, useState } from "react";
import type { Triage } from "../types";
import { isDismissed, OPEN } from "../utils/findings";

type TriageMap = Record<string, Triage | undefined>;

/**
 * Per-finding triage (status + note), kept in localStorage under the contract name so it survives
 * re-exports: finding ids are stable across `node luora-export.mjs` runs.
 */
export function useTriage(contract: string) {
  const key = `luora.triage.${contract}`;
  const [map, setMap] = useState<TriageMap>({});

  useEffect(() => {
    try {
      setMap(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {
      setMap({});
    }
  }, [key]);

  const set = (id: string, patch: Partial<Triage>) => {
    const next = { ...map, [id]: { ...(map[id] ?? OPEN), ...patch } };
    setMap(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  return {
    map,
    get: (id: string) => map[id] ?? OPEN,
    set,
    dismissed: new Set(Object.keys(map).filter((id) => isDismissed(map[id]))),
  };
}

export type TriageState = ReturnType<typeof useTriage>;
