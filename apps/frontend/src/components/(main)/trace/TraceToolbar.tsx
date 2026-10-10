"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode, RefObject } from "react";
import {
  Chip,
  Dropdown,
  EASE,
  PH,
  PhIcon,
  SegmentedControl,
} from "@/components/ui";
import type {
  ChainInfo,
  DisplayKind,
  Frame,
  TestResult,
  TraceMode,
} from "@/features/trace";

/*
 * The trace panel's one header (docs/ux/trace-view.md): who is on screen, the three views, and
 * the few controls that narrow a trace, each with a state you can read at a glance.
 *  - test name, Pass / Fail, file, forge and export time in one place (pin 7951736838549212, one
 *    bar per pane); the breadcrumb and meta chips it replaces said the same thing three times
 *  - views as icon + label tabs, unlike the filters (pin 7951736838549212)
 *  - search calls with a `/` keycap (Phalcon's invocation-flow search; pin 155374255891612555)
 *  - filters as checkboxes with counts (Phalcon's static-call show / hide)
 *  - depth (Phalcon's "Expand: how many levels")
 *  - panels: tests, source, Ask AI (the side panel's other tab), full screen = the trace fills
 *    the app window (Phalcon's full-screen button; pin 363525001193584930)
 *  - a revert banner with a jump (Tenderly: the exact revert point)
 */

const FILTERS: { kind: DisplayKind; label: string; title: string }[] = [
  { kind: "VM", label: "Cheatcodes", title: "vm.prank, vm.expectRevert, …" },
  { kind: "EVENT", label: "Events", title: "Emitted events" },
  {
    kind: "STATICCALL",
    label: "View calls",
    title: "Read-only calls (STATICCALL)",
  },
];

/** what is on screen: the test list, the side panel's Source or Ask AI tab, full screen */
export type Panels = {
  tests: boolean;
  source: boolean;
  ask: boolean;
  full: boolean;
};

export function TraceToolbar({
  test,
  forgeVersion,
  command,
  exportedAt,
  mode,
  onMode,
  scenario,
  query,
  onQuery,
  searchRef,
  hidden,
  onToggle,
  counts,
  depth,
  onDepth,
  maxDepth,
  panels,
  onPanel,
  revert,
  onRevert,
  chain,
  forkPicker,
}: {
  test: TestResult;
  forgeVersion: string;
  command: string;
  exportedAt: string;
  mode: TraceMode;
  onMode: (m: TraceMode) => void;
  scenario: boolean;
  query: string;
  onQuery: (q: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  hidden: Set<DisplayKind>;
  onToggle: (k: DisplayKind) => void;
  counts: Partial<Record<DisplayKind, number>>;
  depth: number;
  onDepth: (d: number) => void;
  maxDepth: number;
  panels: Panels;
  onPanel: (p: keyof Panels) => void;
  revert: { index: number; frame: Frame } | null;
  onRevert: () => void;
  /** the chain this run was forked from, if any */
  chain?: ChainInfo;
  /** Local / testnet forks (shell/ForkPicker) */
  forkPicker?: ReactNode;
}) {
  const pass = test.status === "Success";
  const icon = (d: string) => <PhIcon d={d} className="size-[15px]" />;
  return (
    <div className="flex-none space-y-3 px-5 pt-4 pb-3">
      {/* who is on screen, and the panel controls */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate font-medium font-mono text-[18px] text-fg leading-tight">
              {test.name}
            </h1>
            <Chip tone={pass ? "ok" : "bad"} dot>
              {pass ? "Pass" : "Fail"}
            </Chip>
            {forkPicker}
          </div>
          <p className="mt-1 truncate text-[12.5px] text-dim">
            <span className="font-mono">{test.file}</span>
            {/* the fork first: the rest is cut when the line runs out */}
            {chain && (
              <>
                <span className="mx-1.5">·</span>
                forked {chain.name} at block{" "}
                <span className="font-mono">
                  {chain.block.toLocaleString()}
                </span>
              </>
            )}
            <span className="mx-1.5">·</span>
            <span className="font-mono">{command}</span>
            <span className="mx-1.5">·</span>
            {forgeVersion}
            <span className="mx-1.5">·</span>
            Exported {new Date(exportedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-none items-center gap-1.5">
          {!panels.full && (
            <>
              <button
                type="button"
                className="hdr-pill sm"
                aria-pressed={panels.tests}
                title="Show or hide the test list  ["
                onClick={() => onPanel("tests")}
              >
                {icon(PH.sidebar)}
                Tests
              </button>
              <button
                type="button"
                className="hdr-pill sm"
                aria-pressed={panels.source}
                title="Show or hide the source  ]"
                onClick={() => onPanel("source")}
              >
                <PhIcon d={PH.sidebar} className="size-[15px] -scale-x-100" />
                Source
              </button>
            </>
          )}
          <button
            type="button"
            className="hdr-pill sm"
            aria-pressed={panels.ask}
            title="Ask AI about the selected calls  A"
            onClick={() => onPanel("ask")}
          >
            {icon(PH.sparkle)}
            Ask AI
          </button>
          <button
            type="button"
            className="hdr-pill sm lit"
            title={
              panels.full
                ? "Back to the panels  F / Esc"
                : "The trace fills the window  F"
            }
            onClick={() => onPanel("full")}
          >
            {icon(panels.full ? PH.shrink : PH.expand)}
            {panels.full ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      {/* views, then what narrows the trace */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          size="md"
          value={mode}
          onChange={onMode}
          options={[
            {
              value: "trace",
              label: "Call trace",
              title: "Every call in order  1",
              icon: icon(PH.list),
            },
            {
              value: "graph",
              label: "Call graph",
              title: "Who calls whom  2",
              icon: icon(PH.graph),
            },
            ...(scenario
              ? [
                  {
                    value: "scenario" as const,
                    label: "Scenario",
                    title: "Build a test of intended behaviour  3",
                    icon: icon(PH.flask),
                  },
                ]
              : []),
          ]}
        />
        {mode === "trace" && (
          <label className="hdr-pill sm min-w-[220px] flex-1 cursor-text">
            <PhIcon d={PH.search} className="size-[14px] text-dim" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search calls: contract, function, argument, value"
              aria-label="Search calls"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-dim"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQuery("")}
                className="text-[12px] text-dim hover:text-fg"
              >
                Clear
              </button>
            ) : (
              <span className="kbd">/</span>
            )}
          </label>
        )}
        {mode !== "scenario" && (
          <>
            {/* T2/T3 split capsule: what is shown, each a checkbox with its count */}
            <span className="hdr-pill split sm">
              <span className="text-dim">Show</span>
              {FILTERS.map((f, i) => {
                const on = !hidden.has(f.kind);
                return (
                  <button
                    key={f.kind}
                    type="button"
                    aria-pressed={on}
                    title={f.title}
                    onClick={() => onToggle(f.kind)}
                    className={i < FILTERS.length - 1 ? "mid" : ""}
                  >
                    <PhIcon
                      d={on ? PH.boxOn : PH.boxOff}
                      className="size-[14px]"
                    />
                    {f.label}
                    <span className="font-mono text-[11px] text-dim">
                      {counts[f.kind] ?? 0}
                    </span>
                  </button>
                );
              })}
            </span>
            {mode === "trace" && maxDepth > 1 && (
              <Dropdown
                variant="pill"
                label="Depth"
                ariaLabel="How many call levels to show"
                value={String(depth)}
                onChange={(v) => onDepth(Number(v))}
                options={[
                  { value: "0", label: "All levels" },
                  ...Array.from({ length: maxDepth }, (_, i) => ({
                    value: String(i + 1),
                    label: `${i + 1} ${i ? "levels" : "level"}`,
                  })),
                ]}
              />
            )}
          </>
        )}
      </div>

      {/* a revert, said up front */}
      <AnimatePresence initial={false}>
        {revert && mode !== "scenario" && (
          <motion.div
            key="revert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-tile border border-red/25 bg-red/[.06] px-3 py-2 text-[12.5px]">
              <PhIcon
                d={PH.revert}
                className="size-[15px] flex-none text-red"
              />
              <span className="min-w-0 flex-1 truncate text-body">
                Call <span className="font-mono text-fg">#{revert.index}</span>{" "}
                <span className="font-mono text-fg">
                  {revert.frame.to}.{revert.frame.fn}
                </span>{" "}
                reverted
                {revert.frame.ret && (
                  <>
                    :{" "}
                    <span className="font-mono text-red">
                      {revert.frame.ret}
                    </span>
                  </>
                )}
                <span className="text-dim">
                  {pass
                    ? " · the test passed, so the revert was expected"
                    : " · this is where the test failed"}
                </span>
              </span>
              <button
                type="button"
                onClick={onRevert}
                className="hdr-pill sm flex-none"
              >
                Jump to it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
