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
import {
  BRIDGE_UNREACHABLE,
  type Bridge,
  bridgeFetch,
  bridgeFrom,
} from "../utils/bridge";
import { parseRun, type RunFile } from "../utils/parse-run";

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
  /** the local bridge (luora-bridge.mjs) this tab is linked to: Start test and Reload trace go
   *  through it on the hosted site */
  bridge: Bridge | null;
  /** why the bridge link could not connect, until a retry or a reset */
  bridgeError: string | null;
  /** read the bridge's luora-data.json again (connecting first when needed) */
  reloadBridge: () => void;
  /** forget the bridge link in this tab */
  dropBridge: () => void;
  /** luora-scenarios.json through the bridge: what the auditor's AI client proposed over MCP */
  bridgeScenarios: unknown[];
};

const RunContext = createContext<RunState | null>(null);
const ONBOARDED = "luora:onboarded";
const SAMPLE = "luora:sample";
const FORK = "luora:fork";
const BRIDGE = "luora:bridge";

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
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  // bumped to (re)connect: a new link in the address bar, Retry, Reload trace
  const [link, setLink] = useState(0);
  const [bridgeScenarios, setBridgeScenarios] = useState<unknown[]>([]);
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

  // the link the bridge printed (#bridge=<port>.<token>): kept for this tab only, taken out of the
  // address bar so it is never shared or bookmarked by accident
  useEffect(() => {
    const take = () => {
      const b = bridgeFrom(location.hash);
      if (!b) return;
      try {
        sessionStorage.setItem(BRIDGE, location.hash.split("bridge=")[1]);
      } catch {}
      history.replaceState(null, "", location.pathname + location.search);
      setLink((n) => n + 1);
    };
    take();
    addEventListener("hashchange", take);
    return () => removeEventListener("hashchange", take);
  }, []);
  // connect, then load the project's luora-data.json, as a drop would
  // biome-ignore lint/correctness/useExhaustiveDependencies: `link` is the (re)connect trigger
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(BRIDGE);
    } catch {}
    const b = bridgeFrom(saved);
    if (!b) return;
    let live = true;
    setBridgeError(null);
    (async () => {
      const health = await bridgeFetch(b, "/health");
      const h = await health.json();
      if (!health.ok)
        throw new Error(h.error ?? "The bridge refused this page.");
      if (!live) return;
      setBridge({ ...b, project: h.project });
      const data = await bridgeFetch(b, "/data");
      if (!data.ok) return; // nothing exported yet: Start test makes it
      const r = parseRun(await data.text());
      if (!r.ok) throw new Error(`luora-data.json: ${r.error}`);
      if (live)
        setRun({
          data: r.data,
          name: `${h.project}/luora-data.json`,
          stamp: Date.now(),
        });
    })().catch((e: unknown) => {
      if (!live) return;
      setBridge(null);
      setBridgeError(
        e instanceof TypeError
          ? BRIDGE_UNREACHABLE
          : e instanceof Error
            ? e.message
            : String(e),
      );
    });
    return () => {
      live = false;
    };
  }, [link]);
  // MCP proposals land in luora-scenarios.json while the auditor talks to their AI client: read them
  // on connect and every time the tab comes back into focus; a list that did not change keeps its
  // identity, so the Lab does not re-render for nothing
  useEffect(() => {
    if (!bridge) return setBridgeScenarios([]);
    let last = "";
    const read = () =>
      bridgeFetch(bridge, "/scenarios")
        .then((r) => (r.ok ? r.text() : "[]"))
        .then((text) => {
          if (text === last) return;
          last = text;
          const list: unknown = JSON.parse(text);
          setBridgeScenarios(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    read();
    const onFocus = () => document.visibilityState === "visible" && read();
    addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [bridge]);
  const reloadBridge = useCallback(() => setLink((n) => n + 1), []);
  const dropBridge = useCallback(() => {
    try {
      sessionStorage.removeItem(BRIDGE);
    } catch {}
    setBridge(null);
    setBridgeError(null);
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
      bridge,
      bridgeError,
      reloadBridge,
      dropBridge,
      bridgeScenarios,
    }),
    [
      run,
      origin,
      pane,
      sample,
      setSample,
      fork,
      setFork,
      bridge,
      bridgeError,
      reloadBridge,
      dropBridge,
      bridgeScenarios,
    ],
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
