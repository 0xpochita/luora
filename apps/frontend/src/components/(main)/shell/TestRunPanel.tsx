"use client";

import { useEffect, useRef, useState } from "react";
import { ChainLogo, Dropdown, PH, PhIcon } from "@/components/ui";
import type { RunLine, TestRun } from "@/features/run";
import {
  clock,
  FORK_CHAINS,
  type ResultRow,
} from "@/features/run/utils/test-run";

/*
 * Start test, under Re-run in the Trace sidebar: runs the exporter from the app and reports what
 * forge said, in forge's words, so an auditor reads it the way they read their terminal.
 *  - the button: the header's capsule (header.css .hdr-pill, T1/T2) in green, split like the data
 *    capsule (T3): Start test | where it runs (Local, or Local plus one testnet fork; the Fork
 *    picker's choice by default, and every chain even when the loaded run has no forks). While
 *    it runs the halves become a timer and Stop
 *  - the verdict first, as forge tallies it: "8 passed · 1 failed · 0 skipped"
 *  - each test as forge prints it, [PASS] / [FAIL: reason] / [SKIP] with its (gas: …) or
 *    (runs: …, calls: …, reverts: …), failures on top, a click opens it in the trace
 *    (GitHub Actions: a failed step is the one that opens)
 *  - Output: the exporter's own lines with the elapsed time beside each (Vercel's build log),
 *    open while it runs or when it fails, folded once it passes
 */

const TAG: Record<ResultRow["outcome"], { label: string; cls: string }> = {
  pass: { label: "PASS", cls: "text-green" },
  fail: { label: "FAIL", cls: "text-red" },
  skip: { label: "SKIP", cls: "text-dim" },
};
const DOT: Record<ResultRow["outcome"], string> = {
  pass: "bg-green",
  fail: "bg-red",
  skip: "bg-dim",
};

/** seconds from `from` to `to`, ticking each second until `to` is set */
function useElapsed(from: number, to: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!from || to) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [from, to]);
  return from ? Math.max(0, ((to || now) - from) / 1000) : 0;
}

const chainOf = (key: string) => FORK_CHAINS.find((c) => c.key === key);

export function TestRunPanel({
  run,
  fork,
  forks,
  onOpen,
}: {
  run: TestRun;
  /** the Fork picker's choice, Start test's default target when the run has it */
  fork: string;
  forks: Record<string, unknown>;
  onOpen: (suite: string, name: string) => void;
}) {
  const running = run.phase === "running";
  const elapsed = useElapsed(run.started, run.ended);
  const [target, setTarget] = useState(forks[fork] ? fork : "");
  const ranOn = chainOf(run.fork);

  return (
    <div className="mt-3">
      {running ? (
        <div className="hdr-pill go split w-full">
          <span className="min-w-0 flex-1">
            <span
              aria-hidden="true"
              className="size-3 flex-none animate-spin rounded-full border-[1.5px] border-green/25 border-t-green motion-reduce:animate-none"
            />
            Running tests
            <span className="ml-auto font-mono text-[12px] text-dim tabular-nums">
              {clock(elapsed)}
            </span>
          </span>
          <button
            type="button"
            onClick={run.stop}
            title="Stop the run: ends the exporter and forge"
          >
            <PhIcon d={PH.stop} className="size-[13px]" />
            Stop
          </button>
        </div>
      ) : (
        <div className="hdr-pill go split w-full">
          <button
            type="button"
            className="lead"
            onClick={() => run.start(target)}
            title={`Runs node luora-export.mjs${target ? ` --forks ${target}` : ""} in your Foundry project and loads the result`}
          >
            <PhIcon d={PH.play} className="size-[15px] text-green" />
            Start test
          </button>
          <Dropdown
            variant="bare"
            className="max-w-[124px]"
            ariaLabel="Where Start test runs"
            value={target || "local"}
            onChange={(v) => setTarget(v === "local" ? "" : v)}
            options={[
              {
                value: "local" as string,
                label: "Local",
                text: "Local",
                title: "forge test on an empty local chain",
              },
              ...FORK_CHAINS.map((c) => ({
                value: c.key as string,
                label: c.name.replace(/ \(.*\)$/, ""),
                text: c.name,
                title: `The local run, then the same tests on a fork of ${c.name} at its latest block (read-only, nothing is sent)`,
                icon: <ChainLogo family={c.family} className="size-3.5" />,
                group: "Local + a testnet fork",
              })),
            ]}
          />
        </div>
      )}
      {run.phase !== "idle" && (
        <Report
          key={run.started}
          run={run}
          elapsed={elapsed}
          where={ranOn ? `Fork of ${ranOn.name}` : "Local run"}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}

function Report({
  run,
  elapsed,
  where,
  onOpen,
}: {
  run: TestRun;
  elapsed: number;
  where: string;
  onOpen: (suite: string, name: string) => void;
}) {
  const s = run.summary;
  const verdict =
    run.phase === "running"
      ? { text: "Running", dot: "text-green" }
      : run.phase === "failed"
        ? {
            text: run.error === "Stopped." ? "Stopped" : "Run failed",
            dot: "text-red",
          }
        : s && s.failed > 0
          ? { text: `${s.failed} failing`, dot: "text-red" }
          : { text: "All tests passed", dot: "text-green" };

  return (
    <section
      aria-live="polite"
      className="mt-2 overflow-hidden rounded-inner border border-border bg-inner-grad"
    >
      <div className="px-3 pt-2.5 pb-2.5">
        <p className="flex items-center gap-2 text-[13px] text-fg">
          <span className={`hdr-dot ${verdict.dot}`} aria-hidden="true" />
          {verdict.text}
          <span className="ml-auto font-mono text-[11.5px] text-dim tabular-nums">
            {clock(elapsed)}
          </span>
        </p>
        <p className="mt-0.5 pl-[14px] text-[12px] text-dim">{where}</p>
        {s && (
          // forge's own tally, its own words
          <p className="mt-2 flex flex-wrap gap-x-2.5 pl-[14px] text-[12.5px] text-muted">
            <span>
              <span className="font-medium text-green">{s.passed}</span> passed
            </span>
            <span>
              <span
                className={`font-medium ${s.failed ? "text-red" : "text-fg"}`}
              >
                {s.failed}
              </span>{" "}
              failed
            </span>
            <span>
              <span className="font-medium text-fg">{s.skipped}</span> skipped
            </span>
          </p>
        )}
        {run.phase === "failed" && run.error && run.error !== "Stopped." && (
          <p className="mt-2 break-words pl-[14px] text-[12.5px] text-red leading-normal">
            {run.error}
          </p>
        )}
      </div>
      {s && (
        <ul className="border-border border-t py-1">
          {s.rows.map((r, _, rows) => {
            // forge names a test by its suite too: say it when the name alone is ambiguous
            const twin = rows.some((o) => o !== r && o.name === r.name);
            const tag = TAG[r.outcome];
            const note = r.outcome === "fail" && r.reason ? r.reason : r.detail;
            return (
              <li key={`${r.suite}.${r.name}`}>
                <button
                  type="button"
                  onClick={() => onOpen(r.suite, r.name)}
                  title={`Open ${r.suite}.${r.name} in the trace`}
                  className="flex w-full cursor-pointer flex-col gap-0.5 px-3 py-1.5 text-left transition-colors hover:bg-raised"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 flex-none rounded-full ${DOT[r.outcome]}`}
                    />
                    <span className="truncate font-mono text-[12.5px] text-fg">
                      {r.name}
                      {twin && <span className="text-dim"> {r.suite}</span>}
                    </span>
                  </span>
                  <span className="break-words pl-3.5 font-mono text-[11.5px] text-dim leading-snug">
                    <span className={tag.cls}>[{tag.label}]</span>{" "}
                    {note && (r.outcome === "fail" ? note : `(${note})`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Output
        lines={run.lines}
        running={run.phase === "running"}
        folded={run.phase === "done"}
      />
    </section>
  );
}

function Output({
  lines,
  running,
  folded,
}: {
  lines: RunLine[];
  running: boolean;
  folded: boolean;
}) {
  // open while it runs or when it failed, folded once it passed; a click overrides
  const [pick, setPick] = useState<boolean | null>(null);
  const open = pick ?? !folded;
  const box = useRef<HTMLOListElement>(null);
  // follow the newest line, like a terminal
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per new line
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, open]);

  return (
    <div className="border-border border-t">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setPick(!open)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[12.5px] text-muted transition-colors hover:text-fg"
      >
        <PhIcon
          d={PH.caretRight}
          className={`size-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
        Output
        <span className="text-dim">
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
      </button>
      {open && (
        <ol
          ref={box}
          className="max-h-60 overflow-auto px-3 pb-2.5 font-mono text-[11px] leading-[1.6]"
        >
          {lines.map((l, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: an append-only log
            <li key={i} className="flex gap-2">
              <span className="w-7 flex-none text-right text-dim tabular-nums">
                {clock(l.at)}
              </span>
              <span
                className={`min-w-0 whitespace-pre-wrap break-words ${l.warn ? "text-yellow" : "text-body"}`}
              >
                {l.log.replace(/^luora: /, "")}
              </span>
            </li>
          ))}
          {running && (
            <li className="flex gap-2" aria-hidden="true">
              <span className="w-7 flex-none" />
              <span className="animate-pulse text-dim">▍</span>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
