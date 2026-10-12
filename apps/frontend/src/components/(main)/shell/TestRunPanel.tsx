"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChainLogo, PH, PhIcon, Tabs } from "@/components/ui";
import { LOCAL_APP } from "@/config/site";
import { type RunLine, type TestRun, useRun } from "@/features/run";
import {
  clock,
  exportArgs,
  FORK_CHAINS,
  type LiveRow,
  type ResultRow,
  type RunGroup,
  type RunScope,
} from "@/features/run/utils/test-run";
import { TestChooser } from "./TestChooser";
import { TestWhy } from "./TestWhy";

/*
 * Start test, one row above the trace's Calls list: runs the exporter from the app and reports
 * what forge said, in forge's words, so an auditor reads it the way they read their terminal.
 *  - the button: the header's capsule (header.css .hdr-pill, T1/T2) in green. It runs where the
 *    Fork picker points (Local, or Local plus that testnet fork); while it runs it splits like
 *    the data capsule (T3) into a timer and Stop
 *  - the log is a pop-up (TestRunDialog, the Connect AI dialog's <dialog> and motion) that Start
 *    test opens, laid out like a GitHub Actions job page: the verdict in the header as forge
 *    tallies it ("8 passed · 1 failed · 0 skipped"), the tests on the left, the whole output on
 *    the right. Closed, the row keeps the verdict and an Open log button
 *  - each test as forge prints it, [PASS] / [FAIL: reason] / [SKIP] with its (gas: …) or
 *    (runs: …, calls: …, reverts: …), failures on top. A click shows why it passed or failed
 *    on the right (TestWhy), beside the output; a finished run with failures opens its first
 *    one (GitHub Actions opens a failed step); Open in trace goes to the full trace
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

type TestId = { suite: string; name: string };

/** What a run's command line is, as the log and the buttons' tooltips show it. */
export function commandOf(fork: string, scope?: RunScope | null) {
  const args = exportArgs(scope ? { fork, tests: scope } : { fork });
  return [
    "node luora-export.mjs",
    ...(typeof args === "string"
      ? []
      : args.map((a) => (/[$^|()]/.test(a) ? `'${a}'` : a))),
  ].join(" ");
}

/** where it runs is the Fork picker's choice: the local run, plus that fork when one is shown */
const targetOf = (fork: string, forks: Record<string, unknown>) =>
  forks[fork] ? fork : "";

/** Test all, beside Reload trace: every test, local (plus the fork on screen). */
export function TestAllButton({
  run,
  fork,
  forks,
}: {
  run: TestRun;
  fork: string;
  forks: Record<string, unknown>;
}) {
  const target = targetOf(fork, forks);
  return (
    <button
      type="button"
      className="hdr-pill go flex-none px-3"
      disabled={run.phase === "running"}
      onClick={() => run.start(target)}
      title={`Every test: ${commandOf(target)}`}
    >
      <PhIcon d={PH.play} className="size-[14px] text-green" />
      Test all
    </button>
  );
}

export function TestRunPanel({
  run,
  fork,
  forks,
  current,
  tests,
  end,
}: {
  run: TestRun;
  /** the Fork picker's choice, Start test's default target when the run has it */
  fork: string;
  forks: Record<string, unknown>;
  /** the test on screen: what Start test runs */
  current?: TestId;
  /** every test of the run on screen, for Choose tests */
  tests: TestId[];
  /** at the row's right end, over the Line / Gas used columns: the Fork picker, saying which
   *  chain's run is on screen */
  end?: ReactNode;
}) {
  const { bridge } = useRun();
  const running = run.phase === "running";
  const elapsed = useElapsed(run.started, run.ended);
  const target = targetOf(fork, forks);
  const [choosing, setChoosing] = useState(false);
  const one = current ? [current] : undefined;

  return (
    // the run's controls wrap within the left; the Fork picker keeps the top right
    <div className="mt-1.5 mb-5 flex items-start gap-4">
      {/* Start test runs forge on the auditor's machine: a local Luora, or the hosted one through
          the bridge (the Fork picker stays either way) */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        {(LOCAL_APP || bridge) &&
          (running ? (
            <div className="hdr-pill go split flex-none">
              <button
                type="button"
                className="lead"
                onClick={() => run.setOpen(true)}
                title="Open the log"
              >
                <Spinner />
                Running {scopeLabel(run.scope)}
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
            // GitHub Actions' re-run split button: the one on screen, or choose
            <div className="hdr-pill go split flex-none">
              <button
                type="button"
                className="lead"
                onClick={() => run.start(target, one)}
                title={
                  current
                    ? `Only ${current.suite}.${current.name}: ${commandOf(target, one)}`
                    : commandOf(target)
                }
              >
                <PhIcon d={PH.play} className="size-[15px] text-green" />
                Start test
              </button>
              <button
                type="button"
                onClick={() => setChoosing(true)}
                title="Choose the tests to run"
              >
                <PhIcon d={PH.list} className="size-[14px]" />
                Choose
              </button>
            </div>
          ))}
        {run.phase !== "idle" && (
          // the verdict stays here once the pop-up is closed, as one capsule that reopens it
          <Status run={run} elapsed={elapsed} />
        )}
      </div>
      {end && <div className="mt-0.5 flex-none">{end}</div>}
      <TestChooser
        open={choosing}
        tests={tests}
        chosen={run.chosen}
        onClose={() => setChoosing(false)}
        onStart={(scope) => {
          setChoosing(false);
          run.setChosen(scope);
          run.start(target, scope);
        }}
      />
    </div>
  );
}

/** "all tests", "1 test", "3 tests" */
const scopeLabel = (scope: RunScope | null) =>
  !scope
    ? "all tests"
    : `${scope.length} ${scope.length === 1 ? "test" : "tests"}`;

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
  return `${c ? `Local + fork of ${c.name}` : "Local run"} · ${scopeLabel(run.scope)}`;
};

/** The last run in one capsule: forge's tally (or why it stopped) and its time; opens the log. */
function Status({ run, elapsed }: { run: TestRun; elapsed: number }) {
  const v = verdictOf(run);
  const error =
    run.phase === "failed" && run.error !== "Stopped." ? run.error : null;
  return (
    <button
      type="button"
      className="hdr-pill sm min-w-0"
      onClick={() => run.setOpen(true)}
      title={`${v.text} · ${whereOf(run)}${error ? ` · ${error}` : ""}. Open the log`}
    >
      <span className={`hdr-dot ${v.dot}`} aria-hidden="true" />
      {run.summary ? (
        <Tally s={run.summary} />
      ) : (
        <span className="truncate">{v.text}</span>
      )}
      <span className="font-mono text-[12px] text-dim tabular-nums">
        {clock(elapsed)}
      </span>
      <PhIcon d={PH.terminal} className="size-[14px] text-dim" />
    </button>
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
  const command = commandOf(run.fork, run.scope);
  const all = run.groups.flatMap((g) => g.rows);
  const total = all.length;
  const finished = all.filter((r) => r.outcome !== "running").length;

  // a test picked in the list: the right side says why it passed or failed
  const [pick, setPick] = useState<{ run: string; row: LiveRow } | null>(null);
  const [tab, setTab] = useState<"output" | "test">("output");
  const picked = pick
    ? run.runs[pick.run]?.find(
        (t) => t.suite === pick.row.suite && t.name === pick.row.name,
      )
    : undefined;
  // a new run starts on its output; a finished one with failures opens its first failure
  // (GitHub Actions opens the failed step)
  // biome-ignore lint/correctness/useExhaustiveDependencies: per run, and once it is done
  useEffect(() => {
    const target = run.groups.at(-1);
    const fail = target?.rows.find((r) => r.outcome === "fail");
    if (run.phase === "done" && target && fail) {
      setPick({ run: target.run, row: fail });
      setTab("test");
    } else {
      setPick(null);
      setTab("output");
    }
  }, [run.started, run.phase === "done"]);

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
          <h3 className="flex-none px-4 pt-3 pb-1 text-[12.5px] text-muted">
            Tests{" "}
            {total > 0 && (
              <span className="font-mono text-[12px] text-dim tabular-nums">
                {finished}/{total}
              </span>
            )}
          </h3>
          {run.groups.length ? (
            <div className="min-h-0 flex-1 overflow-auto pb-2">
              {run.groups.map((g) => (
                <Group
                  key={g.run}
                  g={g}
                  picked={pick?.run === g.run ? pick.row : undefined}
                  // a test's trace is in the run file, read once the run has finished
                  onPick={
                    run.phase === "done"
                      ? (row) => {
                          setPick({ run: g.run, row });
                          setTab("test");
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <p className="px-4 py-2 text-[12.5px] text-dim leading-normal">
              {running
                ? "forge is building the project. Its tests are listed here as soon as it knows them."
                : "No results: the run ended before forge reported (see the output)."}
            </p>
          )}
        </section>
        <section className="flex min-h-0 flex-col">
          <div className="flex flex-none items-center gap-2 px-3 pt-2.5 pb-2">
            <Tabs
              size="sm"
              value={picked && tab === "test" ? "test" : "output"}
              onChange={setTab}
              className="min-w-0"
              options={[
                {
                  value: "output",
                  label: `Output · ${run.lines.length}`,
                  title: "What the exporter printed",
                },
                ...(picked
                  ? [
                      {
                        value: "test" as const,
                        label: picked.name,
                        title: `Why ${picked.suite}.${picked.name} ${picked.status === "Success" ? "passed" : picked.status === "Failure" ? "failed" : "was skipped"}`,
                      },
                    ]
                  : []),
              ]}
            />
            {picked && tab === "test" && (
              <button
                type="button"
                className="hdr-pill sm ml-auto flex-none"
                onClick={() => {
                  run.setOpen(false);
                  onOpen(picked.suite, picked.name);
                }}
                title="Close the log and open this test in the trace"
              >
                <PhIcon d={PH.list} className="size-[14px]" />
                Open in trace
              </button>
            )}
          </div>
          {picked && tab === "test" ? (
            <TestWhy test={picked} source={run.sources[picked.file]} />
          ) : (
            <Output lines={run.lines} running={running} />
          )}
        </section>
      </div>
    </dialog>
  );
}

/** One run's tests under its name: Local, or the fork's chain, with how many are done. */
function Group({
  g,
  picked,
  onPick,
}: {
  g: RunGroup;
  picked?: LiveRow;
  onPick?: (r: LiveRow) => void;
}) {
  const chain = chainOf(g.run);
  const done = g.rows.filter((r) => r.outcome !== "running").length;
  return (
    <section className="pt-1.5">
      <p className="flex items-center gap-2 px-4 py-1 text-[11.5px] text-dim">
        <ChainLogo family={chain?.family ?? "local"} className="size-3.5" />
        {chain ? `Fork of ${chain.name}` : "Local"}
        <span className="ml-auto font-mono tabular-nums">
          {done}/{g.rows.length}
        </span>
      </p>
      <ul>
        {g.rows.map((r, _, rows) => (
          <Row
            key={`${r.suite}.${r.name}`}
            r={r}
            twin={rows.some((o) => o !== r && o.name === r.name)}
            picked={picked?.suite === r.suite && picked.name === r.name}
            onPick={onPick && (() => onPick(r))}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  r,
  twin,
  picked,
  onPick,
}: {
  r: LiveRow;
  /** another suite has a test of the same name: say which suite this one is */
  twin: boolean;
  picked: boolean;
  onPick?: () => void;
}) {
  const running = r.outcome === "running";
  const tag = running ? null : TAG[r.outcome as ResultRow["outcome"]];
  const note = r.outcome === "fail" && r.reason ? r.reason : r.detail;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={!onPick}
        aria-pressed={onPick ? picked : undefined}
        title={
          onPick
            ? `Why ${r.suite}.${r.name} ${r.outcome === "pass" ? "passed" : r.outcome === "fail" ? "failed" : "was skipped"}`
            : `${r.suite}.${r.name}`
        }
        className="flex w-full flex-col gap-0.5 px-4 py-1.5 text-left transition-colors enabled:cursor-pointer enabled:hover:bg-raised aria-pressed:bg-raised aria-pressed:shadow-[inset_2px_0_0_rgba(255,255,255,.75)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          {running ? (
            <span
              aria-hidden="true"
              className="-mx-[3px] size-3 flex-none animate-spin rounded-full border-[1.5px] border-white/15 border-t-muted motion-reduce:animate-none"
            />
          ) : (
            <span
              aria-hidden="true"
              className={`size-1.5 flex-none rounded-full ${DOT[r.outcome as ResultRow["outcome"]]}`}
            />
          )}
          <span
            className={`truncate font-mono text-[12.5px] ${running ? "text-muted" : "text-fg"}`}
          >
            {r.name}
            {twin && <span className="text-dim"> {r.suite}</span>}
          </span>
        </span>
        <span className="break-words pl-3.5 font-mono text-[11.5px] text-dim leading-snug">
          {tag ? (
            <>
              <span className={tag.cls}>[{tag.label}]</span>{" "}
              {note && (r.outcome === "fail" ? note : `(${note})`)}
            </>
          ) : (
            "running…"
          )}
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
  );
}
