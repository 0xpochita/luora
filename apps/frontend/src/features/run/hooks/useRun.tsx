"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { RunOrigin } from "../../trace/types";
import type { RunFile } from "../utils/parse-run";

/** A luora-data.json the auditor dropped into this tab. */
export type LoadedRun = { data: RunFile; name: string; stamp: number };
export type RunPane = "welcome" | "project";

type RunState = {
  run: LoadedRun | null;
  setRun: (run: LoadedRun | null) => void;
  /** origin of what the current page shows (null until a page reports it) */
  origin: RunOrigin | null;
  setOrigin: (o: RunOrigin | null) => void;
  pane: RunPane | null;
  setPane: (p: RunPane | null) => void;
};

const RunContext = createContext<RunState | null>(null);
const WELCOMED = "luora:welcomed";

/**
 * Holds a dropped run in memory for this tab. Nothing is uploaded or written to disk: a full
 * reload goes back to the server's data, so an old dropped file can never silently shadow a
 * fresh `node luora-export.mjs`.
 */
export function RunProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<LoadedRun | null>(null);
  const [origin, setOrigin] = useState<RunOrigin | null>(null);
  const [pane, setPane] = useState<RunPane | null>(null);

  // first visit on sample data: say so before anything else
  useEffect(() => {
    if (origin !== "sample") return;
    try {
      if (localStorage.getItem(WELCOMED)) return;
      localStorage.setItem(WELCOMED, "1");
    } catch {}
    setPane("welcome");
  }, [origin]);

  const value = useMemo(
    () => ({ run, setRun, origin, setOrigin, pane, setPane }),
    [run, origin, pane],
  );
  return <RunContext value={value}>{children}</RunContext>;
}

export function useRun() {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error("useRun needs a RunProvider");
  return ctx;
}

/**
 * The source a workspace should show: the dropped run (via `fromFile`, null when the file lacks
 * that view's data) or else the server's. Reports the shown origin to the app header; `key`
 * changes per dropped file so the workspace remounts with fresh selection state.
 */
export function useShownSource<S extends { origin: RunOrigin }>(
  server: S,
  fromFile: (data: RunFile) => S | null,
) {
  const { run, setOrigin } = useRun();
  const source = useMemo(
    () => (run ? fromFile(run.data) : server),
    [run, server, fromFile],
  );
  const origin = run ? "file" : server.origin;
  useEffect(() => {
    setOrigin(origin);
    return () => setOrigin(null);
  }, [origin, setOrigin]);
  return { source, key: run ? String(run.stamp) : "server" };
}
