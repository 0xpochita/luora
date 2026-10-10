"use client";

import { AnimatePresence, animate, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE, ENTER } from "@/components/ui";
import { type AtlasSource, createAtlasModel } from "@/features/atlas";
import { atlasSource } from "@/features/atlas/utils/atlas-source";
import { type RunFile, useRun, useShownSource } from "@/features/run";
import {
  type DisplayKind,
  displayKind,
  locateFrame,
  type TraceMode,
  type TraceSource,
} from "@/features/trace";
import { LabView } from "../atlas/lab/LabView";
import { CallGraph } from "../graph/CallGraph";
import { StartHere } from "../onboarding/StartHere";
import { Sidebar } from "../shell/Sidebar";
import { SourcePanel } from "../source/SourcePanel";
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
  const { run } = useRun();
  // the same run's atlas (for the Scenario tab): the dropped file's, else the server's when it
  // comes from the same place as the trace (a local trace without an atlas gets none)
  const runAtlas = run
    ? atlasSource(run.data, "file")
    : atlas.origin === source.origin
      ? atlas
      : null;
  if (shown.origin === "none") return <StartHere />;
  return (
    shown.source && (
      <TraceBody key={shown.key} source={shown.source} atlas={runAtlas} />
    )
  );
}

/** Owns test / frame / mode / filter selection, the panels, full screen and the keyboard. */
function TraceBody({
  source,
  atlas,
}: {
  source: TraceSource;
  atlas: AtlasSource | null;
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
  const [file, setFile] = useState(files[0] ?? "");
  const [query, setQuery] = useState("");
  /** calls folded shut (Phalcon's fold boxes); their descendants are hidden */
  const [folded, setFolded] = useState<Set<number>>(new Set());
  const [depth, setDepth] = useState(0);
  const [panels, setPanels] = useState<Panels>({
    tests: true,
    source: true,
    full: false,
  });
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const test = data.tests[testIdx];
  const frames = test?.frames ?? [];
  const frame = frameIdx != null ? frames[frameIdx] : undefined;
  const span = frame ? locateFrame(data, frame) : null;

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
    const c = Number(p.get("call"));
    if (p.has("call") && Number.isInteger(c)) setFrameIdx(c);
  }, [data.tests]);
  useEffect(() => {
    if (!test) return;
    const url = new URL(location.href);
    url.searchParams.set("test", test.name);
    if (frameIdx == null) url.searchParams.delete("call");
    else url.searchParams.set("call", String(frameIdx));
    history.replaceState(history.state, "", url);
  }, [test, frameIdx]);

  const selectFrame = (i: number) => {
    setFrameIdx(i);
    const s = locateFrame(data, frames[i]);
    if (s) setFile(s.file);
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
  const onPanel = (k: keyof Panels) =>
    k === "full" ? toggleFull() : setPanels((p) => ({ ...p, [k]: !p[k] }));

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
    mode,
    model,
    selectFrame,
    toggleFull,
    setFull,
    full,
    foldSelected,
  });
  keys.current = {
    rows,
    frameIdx,
    mode,
    model,
    selectFrame,
    toggleFull,
    setFull,
    full,
    foldSelected,
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
        k.selectFrame(k.rows[next].index);
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
          if (k.full) k.setFull(() => false);
          return;
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
          return step(1);
        case "ArrowUp":
        case "k":
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
          return setPanels((p) => ({ ...p, source: !p.source }));
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
            <Sidebar>
              <TestList
                tests={data.tests}
                selected={testIdx}
                onSelect={(i) => {
                  setTestIdx(i);
                  setFrameIdx(null);
                  setFolded(new Set());
                }}
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
          panels={panels}
          onPanel={onPanel}
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
                  onSelect={selectFrame}
                  onFold={(i) => fold(i)}
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
                  onSelect={selectFrame}
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
              [["1", "2", "3"], "views"],
              [["[", "]"], "tests, source"],
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
      <AnimatePresence initial={false}>
        {panels.source && !full && (
          <motion.div
            key="source"
            initial={{ width: 0, opacity: 0, marginLeft: -12 }}
            animate={{ width: 440, opacity: 1, marginLeft: 0 }}
            exit={{ width: 0, opacity: 0, marginLeft: -12 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="flex flex-none overflow-hidden"
          >
            <SourcePanel
              sources={data.sources}
              file={file}
              onFile={setFile}
              span={span}
              frame={frame}
              index={frameIdx}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
