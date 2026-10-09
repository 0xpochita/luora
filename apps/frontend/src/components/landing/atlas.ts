"use client";

import { useSyncExternalStore } from "react";
import type { AtlasData } from "@/features/atlas/types";

/*
 * The sample atlas the live widgets draw from (ProductTabs views, the Triage visual, the How Luora
 * works findings, the Ask window). It is ~35 KB of JSON, so it is not handed down as a prop (that
 * inlines it in the page's HTML): it is prerendered at /landing-atlas.json (app/landing-atlas.json)
 * and fetched once, in parallel with hydration, by whichever widget asks first.
 */
let atlas: Promise<AtlasData> | undefined;
let loaded: AtlasData | null = null;
const subs = new Set<() => void>();

export function loadAtlas() {
  atlas ??= fetch("/landing-atlas.json")
    .then((r) => r.json() as Promise<AtlasData>)
    .then((a) => {
      loaded = a;
      for (const f of subs) f();
      return a;
    });
  return atlas;
}
if (typeof window !== "undefined") void loadAtlas();

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

/** the atlas once it has arrived, null before (and always null in the server render) */
export function useAtlas() {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => null,
  );
}
