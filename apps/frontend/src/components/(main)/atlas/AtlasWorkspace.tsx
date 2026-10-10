"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EASE,
  ENTER,
  Panel,
  PH,
  PhIcon,
  SegmentedControl,
  SolidityLogo,
} from "@/components/ui";
import {
  type AtlasSource,
  type AtlasView,
  createAtlasModel,
  RISK_LABEL,
  useStepSim,
  useTriage,
} from "@/features/atlas";
import { atlasSource } from "@/features/atlas/utils/atlas-source";
import {
  coverageFocus,
  pctLabel,
  ratio,
} from "@/features/atlas/utils/coverage";
import { type RunFile, useShownSource } from "@/features/run";
import { StartHere } from "../onboarding/StartHere";
import { ContractSource } from "./ContractSource";
import { CoverageSummary } from "./CoverageSummary";
import { FlowView } from "./flow/FlowView";
import { LabView } from "./lab/LabView";
import { PieceInspector } from "./PieceInspector";
import { openQuickSearch, QuickSearch } from "./QuickSearch";
import "./atlas.css";

const fromFile = (data: RunFile) => atlasSource(data, "file");

/** Client root of the atlas page: a dropped luora-data.json wins over the server's. */
export function AtlasWorkspace({ source }: { source: AtlasSource }) {
  const shown = useShownSource(source, fromFile);
  if (shown.origin === "none") return <StartHere />;
  if (shown.source) return <AtlasBody key={shown.key} source={shown.source} />;
  return (
    <div className="grid flex-1 place-items-center p-4">
      <Panel
        label="This run has no atlas"
        inset
        className="w-[min(480px,100%)]"
      >
        <p className="px-4 py-3 text-body leading-normal">
          The dropped luora-data.json has traces but no{" "}
          <code className="font-mono">atlas</code> section. luora-export.mjs
          skips it when <code className="font-mono">forge build --ast</code> or{" "}
          <code className="font-mono">forge inspect</code> fails, and prints why
          (<code className="font-mono">luora: atlas skipped</code>). Trace still
          shows this run.
        </p>
      </Panel>
    </div>
  );
}

/*
 * The Atlas, minimal pass (docs/ux/atlas.md): an auditor should never wonder where to look.
 *  - three views, one switch (Hick's law; the same segmented control as Trace): Graph, Paths,
 *    Scenarios
 *  - the contract in one quiet line of numbers, each opening the summary (M1
 *    pin/75716837485844383: a graph with its key numbers, nothing else)
 *  - no panels until asked: the inspector opens on a selection or on those numbers and closes
 *    with Esc (NN/g heuristic 8, Figma UI3's properties panel)
 */
const VIEWS: {
  value: AtlasView;
  label: string;
  title: string;
  icon: string;
}[] = [
  {
    value: "lab",
    label: "Graph",
    title: "What each function reads, writes, calls and emits  1",
    icon: PH.graph,
  },
  {
    value: "flow",
    label: "Paths",
    title: "Each function step by step, with replay  2",
    icon: PH.path,
  },
  {
    value: "scenario",
    label: "Scenarios",
    title: "Write a Foundry test of intended behaviour  3",
    icon: PH.flask,
  },
];

/** Smart-contract visual: graph, paths and scenarios, sharing one selection. */
function AtlasBody({ source }: { source: AtlasSource }) {
  const model = useMemo(() => createAtlasModel(source.data), [source.data]);
  const [view, setView] = useState<AtlasView>("lab");
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState(false);
  // like Trace: the right panel can be put away (] or Inspector) and the canvas can take the
  // whole window (F or Full screen; Esc steps back out)
  const [side, setSide] = useState(true);
  const [full, setFull] = useState(false);
  const sim = useStepSim(model, view === "flow" ? selected : null);
  const triage = useTriage(model.contract);
  const keys = useRef({ open: false, toggleSide: () => {} });
  const select = (id: string | null) => {
    setSelected(id);
    if (id) setSummary(false);
  };
  const close = () => {
    setSelected(null);
    setSummary(false);
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
      if (e.key === "Escape") {
        // the selection first, then full screen
        if (keys.current.open) {
          setSelected(null);
          setSummary(false);
        } else setFull(false);
        return;
      }
      if (e.key === "]" || e.code === "BracketRight")
        return keys.current.toggleSide();
      if (e.key === "f" || e.key === "F") return setFull((v) => !v);
      const n = Number(e.key);
      if (n >= 1 && n <= VIEWS.length) setView(VIEWS[n - 1].value);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const cov = model.coverage;
  const untested = cov ? coverageFocus(model).untested.length : 0;
  const stat = (label: string, value: string, bad = false) => (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className={`font-mono ${bad ? "text-red" : "text-fg"}`}>
        {value}
      </span>
    </span>
  );
  const open = side && (selected != null || summary);
  /** Inspector: put the panel away, or bring it back (the summary when nothing is selected) */
  const toggleSide = () => {
    if (open) return setSide(false);
    setSide(true);
    if (!selected) setSummary(true);
  };
  keys.current = { open: selected != null || summary, toggleSide };

  return (
    <div
      className={`atlas ${full ? "dot-grid fixed inset-0 z-[60] bg-canvas pt-3" : ""}`}
    >
      <header className="flex flex-none items-center gap-3 px-3 pb-2">
        <SegmentedControl
          size="md"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({
            value: v.value,
            label: v.label,
            title: v.title,
            icon: <PhIcon d={v.icon} className="size-[15px]" />,
          }))}
        />
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[12.5px] text-muted">
          <SolidityLogo className="size-3.5 text-body" />
          {model.file.split("/").pop()}
        </span>
        {/* M1: the contract's key numbers as one quiet line; it opens the summary */}
        <button
          type="button"
          aria-pressed={summary}
          title="Coverage, untested entry points and findings"
          onClick={() => {
            setSelected(null);
            setSummary((v) => !v);
          }}
          className="inline-flex h-8 items-center gap-3 rounded-full px-3 text-[12.5px] text-muted transition-colors hover:bg-raised hover:text-fg aria-pressed:bg-raised"
        >
          {cov && stat("Coverage", pctLabel(ratio(cov.lines)))}
          {cov && stat("Untested", String(untested), untested > 0)}
          {stat(
            "Findings",
            String(model.findings.length),
            model.findings.length > 0,
          )}
        </button>
        <button
          type="button"
          onClick={openQuickSearch}
          title="Jump to any function, slot, call, event or finding  / or ⌘K"
          className="hdr-pill sm"
        >
          <PhIcon d={PH.search} className="size-[14px] text-dim" />
          Search
          <span className="kbd">/</span>
        </button>
        <button
          type="button"
          className="hdr-pill sm"
          aria-pressed={open}
          title="Show or hide the inspector  ]"
          onClick={toggleSide}
        >
          <PhIcon d={PH.sidebar} className="size-[15px] -scale-x-100" />
          Inspector
        </button>
        <button
          type="button"
          className="hdr-pill sm lit"
          title={
            full ? "Back to the app  F / Esc" : "The canvas fills the window  F"
          }
          onClick={() => setFull((v) => !v)}
        >
          <PhIcon d={full ? PH.shrink : PH.expand} className="size-[15px]" />
          {full ? "Exit full screen" : "Full screen"}
        </button>
      </header>
      <div className="body">
        <motion.section
          key={view}
          {...ENTER}
          className={view === "flow" ? "stage" : "stage flex flex-col"}
        >
          {view === "flow" ? (
            <FlowView
              model={model}
              selected={selected}
              onSelect={select}
              sim={sim}
            />
          ) : (
            <LabView
              model={model}
              calls={source.calls}
              proposed={source.proposed}
              selected={selected}
              onSelect={select}
              only={view === "scenario" ? "scenario" : "contract"}
            />
          )}
        </motion.section>
        {/* nothing on the right until asked: a selection shows what it is, then its code; the
            numbers in the header show the summary */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="inspector"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 412, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="flex flex-none overflow-hidden"
            >
              <aside className="w-[412px] flex-none">
                {selected ? (
                  <>
                    <PieceInspector
                      key={selected}
                      model={model}
                      id={selected}
                      onSelect={select}
                      triage={triage}
                    />
                    <ContractSource
                      model={model}
                      selected={selected}
                      sim={sim}
                      onSelect={select}
                    />
                  </>
                ) : (
                  <>
                    <p className="flex items-center px-1 pt-1 text-[13px] text-muted">
                      Summary
                      <button
                        type="button"
                        onClick={close}
                        aria-label="Close the summary (Esc)"
                        className="x ml-auto"
                      >
                        ✕
                      </button>
                    </p>
                    <CoverageSummary model={model} onSelect={select} />
                    {model.findings.length > 0 && (
                      <Panel
                        label="Findings"
                        dot="bad"
                        aside={
                          <span className="font-mono">
                            {model.findings.length}
                          </span>
                        }
                      >
                        <ul className="px-1.5 pb-1.5">
                          {model.findings.map((f) => (
                            <li key={f.id}>
                              <button
                                type="button"
                                onClick={() => select(f.id)}
                                className="flex w-full items-center gap-2.5 rounded-tile px-2.5 py-1.5 text-left transition-colors hover:bg-hover"
                              >
                                <span
                                  className={`size-1.5 flex-none rounded-full ${f.risk === "low" ? "bg-yellow" : "bg-red"}`}
                                />
                                <span className="font-mono text-muted text-xs">
                                  {f.name.slice(0, 4)}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[13px] text-body">
                                  {f.name.replace(/^F-\d+\s*/, "")}
                                </span>
                                <span className="flex-none text-dim text-xs">
                                  {RISK_LABEL[f.risk ?? "low"]}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    )}
                  </>
                )}
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <QuickSearch model={model} onSelect={select} />
    </div>
  );
}
