"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseRun, type RunFile } from "../utils/parse-run";
import {
  applyProgress,
  parseEvent,
  type RunGroup,
  type RunSummary,
  summarize,
} from "../utils/test-run";

export type RunLine = { log: string; warn?: boolean; at: number };
export type TestRunState = {
  phase: "idle" | "running" | "done" | "failed";
  /** the fork it ran on ("" = local) */
  fork: string;
  started: number;
  /** when it finished or failed (0 while running) */
  ended: number;
  lines: RunLine[];
  /** the tests per run (local, then the fork): live while it runs, forge's verdict after */
  groups: RunGroup[];
  /** the verdict of the run Start test aimed at (the fork's when there is one) */
  summary: RunSummary | null;
  error: string | null;
};

const IDLE: TestRunState = {
  phase: "idle",
  fork: "",
  started: 0,
  ended: 0,
  lines: [],
  groups: [],
  summary: null,
  error: null,
};

/**
 * Start test: POST /api/test-run, read its NDJSON as it comes (the exporter's own lines), then hand
 * the fresh luora-data.json to `onData` and keep forge's verdict for the sidebar. Held above the
 * trace (TraceWorkspace) so loading the new run, which remounts the trace, keeps the log.
 */
export function useTestRun(onData: (data: RunFile) => void) {
  const [state, setState] = useState<TestRunState>(IDLE);
  // the log pop-up: Start test opens it; closing it leaves the run going
  const [open, setOpen] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const take = useRef(onData);
  useEffect(() => {
    take.current = onData;
  });
  // leaving the page stops the run (the route ends the exporter and its forge processes)
  useEffect(() => () => ctl.current?.abort(), []);

  const start = useCallback(async (fork: string) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState({ ...IDLE, phase: "running", fork, started: Date.now() });
    setOpen(true);
    const fail = (error: string) =>
      setState((s) => ({ ...s, phase: "failed", error, ended: Date.now() }));
    try {
      const res = await fetch("/api/test-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fork }),
        signal: c.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        return fail(
          j?.error ?? `The test run could not start (${res.status}).`,
        );
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += value;
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const e = parseEvent(p);
          if (!e) continue;
          if ("log" in e) {
            setState((s) => ({ ...s, lines: [...s.lines, e] }));
            continue;
          }
          if ("progress" in e) {
            setState((s) => ({
              ...s,
              groups: applyProgress(s.groups, e.progress),
            }));
            continue;
          }
          if (!e.file) return fail(e.error ?? "The test run stopped.");
          const r = parseRun(e.file);
          if (!r.ok) return fail(`luora-data.json: ${r.error}`);
          take.current(r.data);
          const tests = fork ? r.data.forks?.[fork]?.tests : r.data.tests;
          if (!tests)
            return fail(
              "The fork run was skipped (see the output): the local run is loaded.",
            );
          const local = summarize(r.data.tests);
          const summary = fork ? summarize(tests) : local;
          setState((s) => ({
            ...s,
            phase: "done",
            ended: Date.now(),
            summary,
            groups: [
              { run: "local", rows: local.rows },
              ...(fork ? [{ run: fork, rows: summary.rows }] : []),
            ],
          }));
          return;
        }
      }
      fail("The test run stopped before it finished.");
    } catch {
      fail(c.signal.aborted ? "Stopped." : "Lost the connection to the app.");
    }
  }, []);

  const stop = useCallback(() => ctl.current?.abort(), []);
  return { ...state, open, setOpen, start, stop };
}
export type TestRun = ReturnType<typeof useTestRun>;
