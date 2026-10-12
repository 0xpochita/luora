"use client";

import { AnimatePresence, animate, motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE, ENTER, PH, PhIcon, SegmentedControl } from "@/components/ui";
import { type AtlasSource, createAtlasModel } from "@/features/atlas";
import { atlasSource } from "@/features/atlas/utils/atlas-source";
import {
  proposalsFor,
  type RunFile,
  type TestRun,
  useRun,
  useShownSource,
  useTestRun,
} from "@/features/run";
import {
  type CallRange,
  type DisplayKind,
  displayKind,
  type ForkRun,
  locateFrame,
  parseRange,
  rangeParam,
  type TraceMode,
  type TraceSource,
} from "@/features/trace";
import { LabView } from "../atlas/lab/LabView";
import { CallGraph } from "../graph/CallGraph";
import { StartHere } from "../onboarding/StartHere";
import { ForkPicker } from "../shell/ForkPicker";
import { Sidebar } from "../shell/Sidebar";
import {
  TestAllButton,
  TestRunDialog,
  TestRunPanel,
} from "../shell/TestRunPanel";
import { SourcePanel } from "../source/SourcePanel";
import { AskPanel, useAskThread } from "./AskPanel";
import { BalancePanels } from "./BalancePanels";
import { TestList } from "./TestList";
import { TraceList } from "./TraceList";
import { type Panels, TraceToolbar } from "./TraceToolbar";

const fromFile = (data: RunFile): TraceSource => ({ data, origin: "file" });

/** Client root of the trace page: a dropped luora-data.json wins over the server's. */
export function TraceWorkspace({
  source,
  atlas,
}: {
  source: TraceSource;
  atlas: AtlasSource;
}) {
  const shown = useShownSource(source, fromFile);
  const { run, fork, setFork, setRun, bridge, bridgeScenarios } = useRun();
  const router = useRouter();
  // Start test's fresh luora-data.json: a live local run re-reads it from disk; the sample or a
  // dropped file is replaced by it, in this tab only, like a drop
  const testRun = useTestRun((data) =>
    shown.origin === "local"
      ? router.refresh()
      : setRun({ data, name: "luora-data.json", stamp: Date.now() }),
  );
  // the log pop-up lives here, above the trace that a fresh run remounts; a click on one of its
  // tests opens it in whichever trace is current
  const opener = useRef<(suite: string, name: string) => void>(() => {});
  // the same run's atlas (for the Scenario tab): the dropped file's, else the server's when it
  // comes from the same place as the trace (a local trace without an atlas gets none)
  const fileAtlas = run ? atlasSource(run.data, "file") : null;
  const runAtlas = run
    ? fileAtlas && bridge
      ? // linked through the bridge: its AI client's MCP proposals for this contract
        {
          ...fileAtlas,
          proposed: proposalsFor(bridgeScenarios, fileAtlas.data.contract),
        }
      : fileAtlas
    : atlas.origin === source.origin
      ? atlas
      : null;
  if (shown.origin === "none") return <StartHere />;
  if (!shown.source) return null;
  // the chosen fork's run of the same tests (shared with the Atlas), else the local run
  const forks = shown.source.data.forks ?? {};
  const forkRun = forks[fork];
  const view = forkRun
    ? {
        ...shown.source,
        data: {
          ...shown.source.data,
          tests: forkRun.tests,
          chain: forkRun.chain,
        },
      }
    : shown.source;
  return (
    <>
      <TraceBody
        key={`${shown.key}:${forkRun ? fork : "local"}`}
        source={view}
        atlas={runAtlas}
        forkPicker={
          <ForkPicker forks={forks} value={fork} onChange={setFork} />
        }
        testRun={testRun}
        fork={fork}
        forks={forks}
        opener={opener}
      />
      <TestRunDialog run={testRun} onOpen={(s, n) => opener.current(s, n)} />
    </>
  );
}

/** Owns test / frame / mode / filter selection, the panels, full screen and the keyboard. */
function TraceBody({
  source,
  atlas,
  forkPicker,
  testRun,
  fork,
  forks,
  opener,
}: {
  source: TraceSource;
  atlas: AtlasSource | null;
  forkPicker: ReactNode;
  testRun: TestRun;
  fork: string;
  forks: Record<string, ForkRun>;
  opener: RefObject<(suite: string, name: string) => void>;
}) {
  const { data } = source;
  const model = useMemo(
    () => (atlas ? createAtlasModel(atlas.data) : null),
    [atlas],
  );
  const [piece, setPiece] = useState<string | null>(null);
  const files = Object.keys(data.sources);
  const [testIdx, setTestIdx] = useState(() =>
    Math.max(
      0,
      data.tests.findIndex((t) => t.frames.length > 8),
    ),
  );
  const [mode, setMode] = useState<TraceMode>("trace");
  const [hidden, setHidden] = useState<Set<DisplayKind>>(new Set());
  const [frameIdx, setFrameIdx] = useState<number | null>(null);
  /** where a Shift-click range started; the calls from it to frameIdx are selected */
  const [anchor, setAnchor] = useState<number | null>(null);
  const [file, setFile] = useState(files[0] ?? "");
  const [query, setQuery] = useState("");
  /** calls folded shut (Phalcon's fold boxes); their descendants are hidden */
  const [folded, setFolded] = useState<Set<number>>(new Set());
  const [depth, setDepth] = useState(0);
  const [panels, setPanels] = useState({
    tests: true,
    source: true,
    full: false,
  });
  // the side panel: Source or Ask AI. Full screen starts without it; asking brings it back.
  const [side, setSide] = useState<"source" | "ask">("source");
  const [fullSide, setFullSide] = useState(false);
  const [askFocus, setAskFocus] = useState(0);
  const thread = useAskThread();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const test = data.tests[testIdx];
  const frames = test?.frames ?? [];
  const frame = frameIdx != null ? frames[frameIdx] : undefined;
  const span = frame ? locateFrame(data, frame) : null;
  const range: CallRange | null =
    frameIdx == null || !frame
      ? null
      : {
          from: Math.min(anchor ?? frameIdx, frameIdx),
          to: Math.min(
            frames.length - 1,
            Math.max(anchor ?? frameIdx, frameIdx),
          ),
        };

  // what the call trace shows: folds, filters, depth and search, in that order (a search looks
  // inside folded calls too, so a match is never hidden)
  const q = query.trim().toLowerCase();
  const hasKids = (i: number) => (frames[i + 1]?.d ?? -1) > frames[i].d;
  const rows: {
    frame: (typeof frames)[number];
    index: number;
    fold: "open" | "closed" | null;
  }[] = [];
  let hideBelow = Number.POSITIVE_INFINITY;
  for (const [index, f] of frames.entries()) {
    if (!q) {
      if (f.d > hideBelow) continue;
      hideBelow = folded.has(index) ? f.d : Number.POSITIVE_INFINITY;
    }
    if (hidden.has(displayKind(f))) continue;
    if (depth && f.d > depth) continue;
    if (
      q &&
      !`${f.to}.${f.fn} ${f.contract ?? ""} ${f.args} ${f.ret}`
        .toLowerCase()
        .includes(q)
    )
      continue;
    rows.push({
      frame: f,
      index,
      fold: hasKids(index) ? (folded.has(index) ? "closed" : "open") : null,
    });
  }
  const fold = (i: number, shut?: boolean) =>
    setFolded((s) => {
      const next = new Set(s);
      if (shut ?? !next.has(i)) next.add(i);
      else next.delete(i);
      return next;
    });
  const counts: Partial<Record<DisplayKind, number>> = {};
  for (const f of frames) {
    const k = displayKind(f);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const maxDepth = Math.max(0, ...frames.map((f) => f.d));
  const revertAt = frames.findIndex((f) => !f.ok && f.contract !== "vm");
  const revert =
    revertAt >= 0 ? { index: revertAt, frame: frames[revertAt] } : null;

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const t = data.tests.findIndex((x) => x.name === p.get("test"));
    if (t >= 0) setTestIdx(t);
    // ?call=7 or a range, ?call=7-11
    const r = parseRange(p.get("call"));
    if (r) {
      setFrameIdx(r.to);
      setAnchor(r.from === r.to ? null : r.from);
    }
  }, [data.tests]);
  const call = range && rangeParam(range);
  useEffect(() => {
    if (!test) return;
    const url = new URL(location.href);
    url.searchParams.set("test", test.name);
    if (!call) url.searchParams.delete("call");
    else url.searchParams.set("call", call);
    history.replaceState(history.state, "", url);
  }, [test, call]);

  /** show test `i` from its top (the test list, or a Start test result) */
  const openTest = (i: number) => {
    if (i < 0) return;
    setTestIdx(i);
    setFrameIdx(null);
    setAnchor(null);
    setFolded(new Set());
    thread.clear();
  };

  useEffect(() => {
    opener.current = (suite, name) =>
      openTest(
        data.tests.findIndex((t) => t.suite === suite && t.name === name),
      );
  });

  /** select a call; `extend` (Shift) keeps the range's start and moves its end here */
  const selectFrame = (i: number, extend = false) => {
    setAnchor(extend ? (a) => a ?? frameIdx : null);
    setFrameIdx(i);
    const s = locateFrame(data, frames[i]);
    if (s) setFile(s.file);
  };
  const selectRange = (r: CallRange) => {
    selectFrame(r.to);
    setAnchor(r.from === r.to ? null : r.from);
  };
  const toggle = (k: DisplayKind) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // full screen = the trace panel fills the app window (not the browser's full screen): the test
  // list, the source and the app header step aside until F or Esc
  // entering or leaving full screen, the panel settles in from a soft scale instead of jumping
  const setFull = (next: (full: boolean) => boolean) => {
    setPanels((p) => ({ ...p, full: next(p.full) }));
    requestAnimationFrame(() => {
      if (
        root.current &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        animate(
          root.current,
          { opacity: [0.6, 1], scale: [0.985, 1] },
          { duration: 0.28, ease: EASE },
        );
    });
  };
  const toggleFull = () => setFull((f) => !f);
  const sideOpen = panels.full ? fullSide : panels.source;
  const showSide = (open: boolean) =>
    panels.full
      ? setFullSide(open)
      : setPanels((p) => ({ ...p, source: open }));
  /** Source / Ask AI buttons: open the panel on that tab, or close it when it is already there */
  const toggleSide = (tab: "source" | "ask") => {
    if (sideOpen && side === tab) return showSide(false);
    setSide(tab);
    showSide(true);
    if (tab === "ask") setAskFocus((n) => n + 1);
  };
  const openAsk = () => {
    setSide("ask");
    showSide(true);
    setAskFocus((n) => n + 1);
  };
  const onPanel = (k: keyof Panels) =>
    k === "full"
      ? toggleFull()
      : k === "tests"
        ? setPanels((p) => ({ ...p, tests: !p.tests }))
        : toggleSide(k);
  const shown: Panels = {
    tests: panels.tests,
    source: sideOpen && side === "source",
    ask: sideOpen && side === "ask",
    full: panels.full,
  };

  const jumpToRevert = () => {
    if (!revert) return;
    setMode("trace");
    setQuery("");
    setDepth(0);
    selectFrame(revert.index);
  };

  // keyboard (docs/ux/trace-view.md): ↑ ↓ / j k step, / search, 1 2 3 views, [ ] panels, F full
  const full = panels.full;
  const foldSelected = (shut: boolean) => {
    if (frameIdx == null || !frames[frameIdx]) return;
    if (hasKids(frameIdx) && folded.has(frameIdx) !== shut)
      return fold(frameIdx, shut);
    // already folded (or a leaf): ← jumps to the parent call, as tree views do
    if (shut)
      for (let i = frameIdx - 1; i >= 0; i--)
        if (frames[i].d < frames[frameIdx].d) return selectFrame(i);
  };
  const keys = useRef({
    rows,
    frameIdx,
    anchor,
    mode,
    model,
    selectFrame,
    toggleFull,
    setFull,
    full,
    foldSelected,
    openAsk,
    sideOpen,
    showSide,
  });
  keys.current = {
    rows,
    frameIdx,
    anchor,
    mode,
    model,
    selectFrame,
    toggleFull,
    setFull,
    full,
    foldSelected,
    openAsk,
    sideOpen,
    showSide,
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest("input, textarea, select, [contenteditable='true'], dialog")
      )
        return;
      const k = keys.current;
      const step = (dir: 1 | -1) => {
        if (k.mode !== "trace" || !k.rows.length) return;
        e.preventDefault();
        const at = k.rows.findIndex((r) => r.index === k.frameIdx);
        const next =
          at < 0
            ? dir > 0
              ? 0
              : k.rows.length - 1
            : Math.min(k.rows.length - 1, Math.max(0, at + dir));
        k.selectFrame(k.rows[next].index, e.shiftKey);
      };
      // e.code as a fallback: some keyboard layouts and remote inputs send no usable e.key
      const key =
        e.code === "Slash"
          ? "/"
          : e.code === "BracketLeft"
            ? "["
            : e.code === "BracketRight"
              ? "]"
              : e.key;
      switch (key) {
        case "Escape":
          // a range first, then full screen
          if (k.anchor != null) return k.selectFrame(k.frameIdx ?? 0);
          if (k.full) k.setFull(() => false);
          return;
        case "a":
        case "A":
          if (k.mode !== "trace" && k.mode !== "graph") return;
          e.preventDefault();
          return k.openAsk();
        case "ArrowLeft":
        case "h":
          if (k.mode !== "trace") return;
          e.preventDefault();
          return k.foldSelected(true);
        case "ArrowRight":
        case "l":
          if (k.mode !== "trace") return;
          e.preventDefault();
          return k.foldSelected(false);
        case "ArrowDown":
        case "j":
        case "J":
          return step(1);
        case "ArrowUp":
        case "k":
        case "K":
          return step(-1);
        case "/":
          e.preventDefault();
          setMode("trace");
          requestAnimationFrame(() => search.current?.focus());
          return;
        case "f":
        case "F":
          return k.toggleFull();
        case "[":
          return setPanels((p) => ({ ...p, tests: !p.tests }));
        case "]":
          return k.showSide(!k.sideOpen);
        case "1":
          return setMode("trace");
        case "2":
          return setMode("graph");
        case "3":
          if (k.model) setMode("scenario");
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!test)
    return <p className="p-10 text-muted">No tests in luora-data.json.</p>;

  return (
    <div
      ref={root}
      className={`flex min-h-0 flex-1 gap-3 ${full ? "dot-grid fixed inset-0 z-[60] bg-canvas p-3" : "px-3 pb-3"}`}
    >
      {/* the test list slides open and shut (its 12px gap folds with it) */}
      <AnimatePresence initial={false}>
        {panels.tests && !full && (
          <motion.div
            key="tests"
            initial={{ width: 0, opacity: 0, marginRight: -12 }}
            animate={{ width: 272, opacity: 1, marginRight: 0 }}
            exit={{ width: 0, opacity: 0, marginRight: -12 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="flex flex-none overflow-hidden"
          >
            <Sidebar
              action={<TestAllButton run={testRun} fork={fork} forks={forks} />}
            >
              <TestList
                tests={data.tests}
                selected={testIdx}
                onSelect={openTest}
              />
            </Sidebar>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card-grad shadow-soft">
        <TraceToolbar
          test={test}
          forgeVersion={data.forgeVersion}
          command={data.command}
          exportedAt={data.generatedAt}
          mode={mode}
          onMode={setMode}
          scenario={!!model}
          query={query}
          onQuery={setQuery}
          searchRef={search}
          hidden={hidden}
          onToggle={toggle}
          counts={counts}
          depth={depth}
          onDepth={setDepth}
          maxDepth={maxDepth}
          panels={shown}
          onPanel={onPanel}
          chain={data.chain}
          revert={revert}
          onRevert={jumpToRevert}
        />
        {mode === "scenario" && model ? (
          // the Atlas Lab's Scenario editor, on this run's contract
          <motion.div
            key="scenario"
            {...ENTER}
            className="relative flex min-h-0 flex-1 flex-col"
          >
            <LabView
              model={model}
              calls={atlas?.calls}
              proposed={atlas?.proposed}
              selected={piece}
              onSelect={setPiece}
              only="scenario"
            />
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            {...ENTER}
            className={`flex-1 overflow-auto px-5 pb-5 ${mode === "graph" ? "flex flex-col" : ""}`}
          >
            <TestRunPanel
              run={testRun}
              fork={fork}
              forks={forks}
              current={test}
              tests={data.tests}
              end={forkPicker}
            />
            {mode === "trace" ? (
              <>
                <TraceList
                  rows={rows}
                  total={frames.length}
                  maxGas={Math.max(1, ...frames.map((f) => f.gas ?? 0))}
                  filtered={
                    !!q || depth > 0 || hidden.size > 0 || folded.size > 0
                  }
                  selected={frameIdx}
                  range={range}
                  onSelect={selectFrame}
                  onFold={(i) => fold(i)}
                  onAsk={openAsk}
                  onReset={() => {
                    setQuery("");
                    setDepth(0);
                    setHidden(new Set());
                    setFolded(new Set());
                  }}
                />
                <BalancePanels transfers={test.transfers} />
              </>
            ) : (
              <div className="min-h-0 flex-1">
                <CallGraph
                  frames={frames}
                  hidden={hidden}
                  selected={frameIdx}
                  onSelect={(i) => selectFrame(i)}
                />
              </div>
            )}
          </motion.div>
        )}
        {/* the keyboard, said once where it is used */}
        <footer className="flex flex-none flex-wrap items-center gap-x-4 gap-y-1 border-border border-t px-5 py-2 text-[12px] text-dim">
          {(
            [
              [["↑", "↓"], "step through calls"],
              [["←", "→"], "fold, unfold"],
              [["/"], "search"],
              [["A"], "ask AI"],
              [["1", "2", "3"], "views"],
              [["[", "]"], "side panels"],
              [["F"], full ? "exit full screen" : "full screen"],
            ] as const
          ).map(([ks, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              {ks.map((key) => (
                <span key={key} className="kbd">
                  {key}
                </span>
              ))}
              {label}
            </span>
          ))}
        </footer>
      </main>
      {/* the side panel: Source, or Ask AI about the selected calls (R4: the assistant as a tab
          of the panel beside the data) */}
      <AnimatePresence initial={false}>
        {sideOpen && (
          <motion.div
            key="side"
            initial={{ width: 0, opacity: 0, marginLeft: -12 }}
            animate={{ width: 440, opacity: 1, marginLeft: 0 }}
            exit={{ width: 0, opacity: 0, marginLeft: -12 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="flex flex-none overflow-hidden"
          >
            <section className="flex min-h-0 w-[440px] flex-none flex-col rounded-card border border-border bg-card-grad shadow-soft">
              <header className="flex flex-none items-center gap-2 px-3 pt-3 pb-2.5">
                <SegmentedControl
                  value={side}
                  onChange={(t) => (t === "ask" ? openAsk() : setSide(t))}
                  options={[
                    {
                      value: "source",
                      label: "Source",
                      title: "The lines the call ran",
                      icon: <PhIcon d={PH.code} className="size-[14px]" />,
                    },
                    {
                      value: "ask",
                      label: "Ask AI",
                      title: "Ask about the selected calls  A",
                      icon: <PhIcon d={PH.sparkle} className="size-[14px]" />,
                    },
                  ]}
                />
                <span className="ml-auto text-[12.5px] text-dim">
                  {side === "source" &&
                    span &&
                    `L${span.start + 1}–${span.end + 1}`}
                </span>
              </header>
              <motion.div
                key={side}
                {...ENTER}
                className="flex min-h-0 flex-1 flex-col"
              >
                {side === "source" ? (
                  <SourcePanel
                    sources={data.sources}
                    file={file}
                    onFile={setFile}
                    span={span}
                    frame={frame}
                    index={frameIdx}
                  />
                ) : (
                  <AskPanel
                    data={data}
                    test={test}
                    range={range}
                    thread={thread}
                    focus={askFocus}
                    onRange={(r) => {
                      setMode((m) => (m === "scenario" ? "trace" : m));
                      selectRange(r);
                    }}
                  />
                )}
              </motion.div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
