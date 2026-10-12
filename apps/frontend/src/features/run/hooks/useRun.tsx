"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { RunOrigin } from "../../trace/types";
import type { RunFile } from "../utils/parse-run";

/** A luora-data.json the auditor dropped into this tab. */
export type LoadedRun = { data: RunFile; name: string; stamp: number };
export type RunPane = "welcome" | "project" | "look";

type RunState = {
  run: LoadedRun | null;
  setRun: (run: LoadedRun | null) => void;
  /** origin of what the current page shows (null until a page reports it) */
  origin: RunOrigin | null;
  setOrigin: (o: RunOrigin | null) => void;
  pane: RunPane | null;
  setPane: (p: RunPane | null) => void;
  /** the user chose "Try the sample" on the Start page (remembered in this browser) */
  sample: boolean;
  setSample: (on: boolean) => void;
  /** the forked chain Trace and Atlas show ("" = the local run), remembered in this browser */
  fork: string;
  setFork: (key: string) => void;
};

const RunContext = createContext<RunState | null>(null);
const ONBOARDED = "luora:onboarded";
const SAMPLE = "luora:sample";
const FORK = "luora:fork";

/**
 * Holds a dropped run in memory for this tab. Nothing is uploaded or written to disk: a full
 * reload goes back to the server's data, so an old dropped file can never silently shadow a
 * fresh `node luora-export.mjs`.
 */
export function RunProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<LoadedRun | null>(null);
  const [origin, setOrigin] = useState<RunOrigin | null>(null);
  const [pane, setPane] = useState<RunPane | null>(null);
  const [sample, setSampleState] = useState(false);
  const [fork, setForkState] = useState("");
  useEffect(() => {
    try {
      setSampleState(localStorage.getItem(SAMPLE) === "1");
      setForkState(localStorage.getItem(FORK) ?? "");
    } catch {}
  }, []);
  const setFork = useCallback((key: string) => {
    setForkState(key);
    try {
      if (key) localStorage.setItem(FORK, key);
      else localStorage.removeItem(FORK);
    } catch {}
  }, []);
  const setSample = useCallback((on: boolean) => {
    setSampleState(on);
    try {
      if (on) localStorage.setItem(SAMPLE, "1");
      else localStorage.removeItem(SAMPLE);
    } catch {}
  }, []);

  // the first session opens once per browser, on the first page that shows a run (sample, the
  // local export or a dropped file): with nothing loaded the Start page is the onboarding itself
  useEffect(() => {
    if (!origin || origin === "none") return;
    try {
      if (localStorage.getItem(ONBOARDED)) return;
      localStorage.setItem(ONBOARDED, "1");
    } catch {}
    // a dropped file came through the Start page or the session itself, which show the next step
    if (origin !== "file") setPane("welcome");
  }, [origin]);

  const value = useMemo(
    () => ({
      run,
      setRun,
      origin,
      setOrigin,
      pane,
      setPane,
      sample,
      setSample,
      fork,
      setFork,
    }),
    [run, origin, pane, sample, setSample, fork, setFork],
  );
  return <RunContext value={value}>{children}</RunContext>;
}

export function useRun() {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error("useRun needs a RunProvider");
  return ctx;
}

/**
 * The same state, or null without a RunProvider above: for a Suspense fallback, which Next also
 * renders on its own to check that navigating to the page is instant.
 */
export const useRunIfAny = () => useContext(RunContext);

/**
 * The source a workspace should show: the dropped run (via `fromFile`, null when the file lacks
 * that view's data) or else the server's. Reports the shown origin to the app header; `key`
 * changes per dropped file so the workspace remounts with fresh selection state.
 */
export function useShownSource<S extends { origin: RunOrigin }>(
  server: S,
  fromFile: (data: RunFile) => S | null,
) {
  const { run, sample, setOrigin } = useRun();
  // nothing loaded + "Try the sample" chosen: the server's unshown sample, now shown as such
  const asSample = !run && sample && server.origin === "none";
  const source = useMemo(
    () =>
      run
        ? fromFile(run.data)
        : asSample
          ? { ...server, origin: "sample" as const }
          : server,
    [run, server, fromFile, asSample],
  );
  const origin: RunOrigin = run ? "file" : asSample ? "sample" : server.origin;
  useEffect(() => {
    setOrigin(origin);
    return () => setOrigin(null);
  }, [origin, setOrigin]);
  return { source, origin, key: run ? String(run.stamp) : "server" };
}
