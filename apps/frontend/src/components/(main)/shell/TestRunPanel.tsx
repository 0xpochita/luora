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
 * Start test, one row above the trace's Calls list: runs the exporter from the app and reports
 * what forge said, in forge's words, so an auditor reads it the way they read their terminal.
 *  - the button: the header's capsule (header.css .hdr-pill, T1/T2) in green, split like the data
 *    capsule (T3): Start test | where it runs (Local, or Local plus one testnet fork; the Fork
 *    picker's choice by default, and every chain even when the loaded run has no forks). While
 *    it runs the halves become a timer and Stop
 *  - the log is a pop-up (TestRunDialog, the Connect AI dialog's <dialog> and motion) that Start
 *    test opens, laid out like a GitHub Actions job page: the verdict in the header as forge
 *    tallies it ("8 passed · 1 failed · 0 skipped"), the tests on the left, the whole output on
 *    the right. Closed, the row keeps the verdict and an Open log button
 *  - each test as forge prints it, [PASS] / [FAIL: reason] / [SKIP] with its (gas: …) or
 *    (runs: …, calls: …, reverts: …), failures on top (GitHub Actions opens a failed step), a
 *    click opens it in the trace
 *  - Output: the exporter's own lines with the elapsed time beside each (Vercel's build log)
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
}: {
  run: TestRun;
  /** the Fork picker's choice, Start test's default target when the run has it */
  fork: string;
  forks: Record<string, unknown>;
}) {
  const running = run.phase === "running";
  const elapsed = useElapsed(run.started, run.ended);
  const [target, setTarget] = useState(forks[fork] ? fork : "");

  return (
    <div className="mt-1.5 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      {running ? (
        <div className="hdr-pill go split w-[244px] flex-none">
          <button
            type="button"
            className="lead"
            onClick={() => run.setOpen(true)}
            title="Open the log"
          >
            <Spinner />
            Running tests
            <span className="ml-auto font-mono text-[12px] text-dim tabular-nums">
              {clock(elapsed)}
            </span>
          </button>
          <button
            type="button"
            className="stop"
            onClick={run.stop}
            title="Stop the run: ends the exporter and forge"
          >
            <PhIcon d={PH.stop} className="size-[13px]" />
            Stop
          </button>
        </div>
      ) : (
        <div className="hdr-pill go split w-[244px] flex-none">
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
        // the verdict stays here once the pop-up is closed
        <>
          <Verdict run={run} elapsed={elapsed} />
          {run.summary && <Tally s={run.summary} />}
          <button
            type="button"
            className="hdr-pill sm"
            onClick={() => run.setOpen(true)}
          >
            <PhIcon d={PH.terminal} className="size-[14px]" />
            Open log
          </button>
        </>
      )}
    </div>
  );
}

const Spinner = () => (
  <span
    aria-hidden="true"
    className="size-3 flex-none animate-spin rounded-full border-[1.5px] border-green/25 border-t-green motion-reduce:animate-none"
  />
);

function verdictOf(run: TestRun) {
  const s = run.summary;
  if (run.phase === "running") return { text: "Running", dot: "text-green" };
  if (run.phase === "failed")
    return {
      text: run.error === "Stopped." ? "Stopped" : "Run failed",
      dot: "text-red",
    };
  return s && s.failed > 0
    ? { text: `${s.failed} failing`, dot: "text-red" }
    : { text: "All tests passed", dot: "text-green" };
}

const whereOf = (run: TestRun) => {
  const c = chainOf(run.fork);
  return c ? `Local + fork of ${c.name}` : "Local run";
};

function Verdict({ run, elapsed }: { run: TestRun; elapsed: number }) {
  const v = verdictOf(run);
  const error =
    run.phase === "failed" && run.error !== "Stopped." ? run.error : null;
  return (
    <p className="flex min-w-0 items-center gap-2 text-[13px] text-fg">
      <span className={`hdr-dot ${v.dot}`} aria-hidden="true" />
      {v.text}
      <span className="font-mono text-[12px] text-dim tabular-nums">
        {clock(elapsed)}
      </span>
      <span className="truncate text-[12.5px] text-dim">
        <span className="mr-1.5">·</span>
        {whereOf(run)}
      </span>
      {error && (
        <span
          className="truncate text-[12.5px] text-red"
          title={error ?? undefined}
        >
          <span className="mr-1.5">·</span>
          {error}
        </span>
      )}
    </p>
  );
}

/** forge's own tally, its own words */
function Tally({
  s,
  className = "",
}: {
  s: NonNullable<TestRun["summary"]>;
  className?: string;
}) {
  return (
    <p
      className={`flex flex-wrap gap-x-2.5 text-[12.5px] text-muted ${className}`}
    >
      <span>
        <span className="font-medium text-green">{s.passed}</span> passed
      </span>
      <span>
        <span className={`font-medium ${s.failed ? "text-red" : "text-fg"}`}>
          {s.failed}
        </span>{" "}
        failed
      </span>
      <span>
        <span className="font-medium text-fg">{s.skipped}</span> skipped
      </span>
    </p>
  );
}

/** The log as a pop-up: verdict on top, the tests on the left, the whole output on the right. */
export function TestRunDialog({
  run,
  onOpen,
}: {
  run: TestRun;
  onOpen: (suite: string, name: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const elapsed = useElapsed(run.started, run.ended);
  const running = run.phase === "running";
  const s = run.summary;
  const v = verdictOf(run);
  useEffect(() => {
    const d = dialog.current;
    if (run.open && !d?.open) d?.showModal();
    if (!run.open && d?.open) d.close();
  }, [run.open]);
  const command = `node luora-export.mjs${run.fork ? ` --forks ${run.fork}` : ""}`;

  return (
    <dialog
      ref={dialog}
      aria-label="Test run log"
      onClose={() => run.setOpen(false)}
      onClick={(e) => e.target === dialog.current && run.setOpen(false)}
      // the trace's own keys (F, /, 1 2 3, Esc) stay out while the log is up
      onKeyDown={(e) => e.stopPropagation()}
      className="ai-dialog m-auto h-[min(720px,calc(100dvh-48px))] w-[min(1040px,calc(100vw-32px))] overflow-hidden rounded-card border border-border bg-card-grad p-0 text-fg shadow-float open:flex open:flex-col"
    >
      <header className="flex flex-none flex-wrap items-center gap-x-4 gap-y-2 border-border border-b px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-[14px]">
            <span className={`hdr-dot ${v.dot}`} aria-hidden="true" />
            {v.text}
            <span className="font-mono font-normal text-[12px] text-dim tabular-nums">
              {clock(elapsed)}
            </span>
          </p>
          <p className="mt-0.5 truncate pl-[14px] text-[12px] text-dim">
            {whereOf(run)} ·{" "}
            <code className="font-mono text-muted">{command}</code>
          </p>
        </div>
        {s && <Tally s={s} />}
        <div className="ml-auto flex items-center gap-1.5">
          {running && (
            <button
              type="button"
              className="hdr-pill sm danger"
              onClick={run.stop}
              title="Stop the run: ends the exporter and forge"
            >
              <PhIcon d={PH.stop} className="size-[13px]" />
              Stop
            </button>
          )}
          <button
            type="button"
            className="hdr-pill sm"
            onClick={() => run.setOpen(false)}
            title="Close the log  Esc (the run goes on)"
          >
            Close
            <span className="kbd">Esc</span>
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:grid-rows-1">
        <section className="flex min-h-0 flex-col border-border border-b md:border-r md:border-b-0">
          <h3 className="flex-none px-4 pt-3 pb-1.5 text-[12.5px] text-muted">
            Tests {s && <span className="text-dim">{s.rows.length}</span>}
          </h3>
          {s ? (
            <ul className="min-h-0 flex-1 overflow-auto pb-2">
              {s.rows.map((r, _, rows) => (
                <Row
                  key={`${r.suite}.${r.name}`}
                  r={r}
                  twin={rows.some((o) => o !== r && o.name === r.name)}
                  onOpen={() => {
                    run.setOpen(false);
                    onOpen(r.suite, r.name);
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-2 text-[12.5px] text-dim leading-normal">
              {running
                ? "forge is running the tests. Each one shows here, passed or failed, as soon as the run ends."
                : "No results: the run ended before forge reported (see the output)."}
            </p>
          )}
        </section>
        <Output lines={run.lines} running={running} />
      </div>
    </dialog>
  );
}

function Row({
  r,
  twin,
  onOpen,
}: {
  r: ResultRow;
  /** another suite has a test of the same name: say which suite this one is */
  twin: boolean;
  onOpen: () => void;
}) {
  const tag = TAG[r.outcome];
  const note = r.outcome === "fail" && r.reason ? r.reason : r.detail;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        title={`Open ${r.suite}.${r.name} in the trace`}
        className="flex w-full cursor-pointer flex-col gap-0.5 px-4 py-1.5 text-left transition-colors hover:bg-raised"
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
}

function Output({ lines, running }: { lines: RunLine[]; running: boolean }) {
  const box = useRef<HTMLOListElement>(null);
  // follow the newest line, like a terminal
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per new line
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <section className="flex min-h-0 flex-col">
      <h3 className="flex-none px-4 pt-3 pb-1.5 text-[12.5px] text-muted">
        Output{" "}
        <span className="text-dim">
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
      </h3>
      <ol
        ref={box}
        className="mx-3 mb-3 min-h-0 flex-1 overflow-auto rounded-inner border border-border bg-inset px-3 py-2.5 font-mono text-[12px] leading-[1.7]"
      >
        {lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: an append-only log
          <li key={i} className="flex gap-3">
            <span className="w-8 flex-none text-right text-dim tabular-nums">
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
          <li className="flex gap-3" aria-hidden="true">
            <span className="w-8 flex-none" />
            <span className="animate-pulse text-dim">▍</span>
          </li>
        )}
      </ol>
    </section>
  );
}
