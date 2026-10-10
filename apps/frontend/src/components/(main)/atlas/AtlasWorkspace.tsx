"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dropdown,
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
import { useAiThread } from "../ai/AiChat";
import { StartHere } from "../onboarding/StartHere";
import { AtlasAsk } from "./AtlasAsk";
import { ContractSource } from "./ContractSource";
import { CoverageSummary } from "./CoverageSummary";
import { LabView } from "./lab/LabView";
import { PieceInspector } from "./PieceInspector";
import { PathsView } from "./paths/PathsView";
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
  // the contract on screen: the export's main one, or another the project deploys (mocks too)
  const all = [source.data, ...(source.contracts ?? [])];
  const [name, setName] = useState(source.data.contract);
  const data = all.find((c) => c.contract === name) ?? source.data;
  const main = data === source.data;
  const model = useMemo(() => createAtlasModel(data), [data]);
  const [view, setView] = useState<AtlasView>("lab");
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState(false);
  // like Trace: the right panel can be put away (] or Inspector) and the canvas can take the
  // whole window (F or Full screen; Esc steps back out)
  const [side, setSide] = useState(true);
  const [full, setFull] = useState(false);
  // the right panel's two tabs: what the selection is, or the chat about it (as in Trace)
  const [tab, setTab] = useState<"details" | "ask">("details");
  const [askFocus, setAskFocus] = useState(0);
  const thread = useAiThread();
  // the function Paths shows (its own choice, so selecting a step for the inspector keeps it)
  const [lane, setLane] = useState<string | null>(null);
  const sim = useStepSim(
    model,
    view === "flow" ? (lane ?? model.entry[0] ?? null) : null,
  );
  const triage = useTriage(model.contract);
  const keys = useRef({
    selected: false,
    open: false,
    toggle: (_t: "details" | "ask") => {},
  });
  // a selection brings the panel back (Figma UI3); in the chat it becomes the question's context
  const select = (id: string | null) => {
    setSelected(id);
    if (id) {
      setSummary(false);
      setSide(true);
    }
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
      if (e.key === "Escape") {
        // the selection first, then the panel, then full screen
        if (k.selected) setSelected(null);
        else if (k.open) setSide(false);
        else setFull(false);
        setSummary(false);
        return;
      }
      if (e.key === "]" || e.code === "BracketRight")
        return k.toggle("details");
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        return k.toggle("ask");
      }
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
  const open = side && (tab === "ask" || selected != null || summary);
  const showTab = (t: "details" | "ask") => {
    setTab(t);
    setSide(true);
    if (t === "details" && !selected) setSummary(true);
    if (t === "ask") setAskFocus((n) => n + 1);
  };
  /** Inspector / Ask AI buttons: open the panel on that tab, or put it away when it is already there */
  const toggle = (t: "details" | "ask") =>
    open && tab === t ? setSide(false) : showTab(t);
  keys.current = { selected: selected != null, open, toggle };

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
        {all.length > 1 ? (
          <div className="ml-auto">
            <Dropdown
              variant="pill"
              mono
              ariaLabel="Contract"
              value={name}
              onChange={(c) => {
                // another contract: a fresh selection, panel and conversation
                setName(c);
                setLane(null);
                setSelected(null);
                setSummary(false);
                thread.clear();
              }}
              options={all.map((c) => ({
                value: c.contract,
                label: c.contract,
                text: c.contract,
                title: c.file,
                icon: <SolidityLogo className="size-3.5 text-body" />,
                group: /(^|\/)mocks?\//.test(c.file)
                  ? "Mocks · test helpers"
                  : "Contracts",
              }))}
            />
          </div>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[12.5px] text-muted">
            <SolidityLogo className="size-3.5 text-body" />
            {model.file.split("/").pop()}
          </span>
        )}
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
          aria-pressed={open && tab === "ask"}
          title="Ask AI about the contract or the selected piece  A"
          onClick={() => toggle("ask")}
        >
          <PhIcon d={PH.sparkle} className="size-[15px]" />
          Ask AI
        </button>
        <button
          type="button"
          className="hdr-pill sm"
          aria-pressed={open && tab === "details"}
          title="Show or hide the inspector  ]"
          onClick={() => toggle("details")}
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
          key={`${view}:${name}`}
          {...ENTER}
          className={view === "flow" ? "stage" : "stage flex flex-col"}
        >
          {view === "flow" ? (
            <PathsView
              model={model}
              lane={lane}
              onLane={setLane}
              sim={sim}
              onSelect={select}
            />
          ) : (
            <LabView
              model={model}
              calls={main ? source.calls : source.callsBy?.[name]}
              proposed={main ? source.proposed : undefined}
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
                {/* Details | Ask AI, as Trace's side panel (Source | Ask AI) */}
                <div className="flex items-center gap-2 pt-1">
                  <SegmentedControl
                    value={tab}
                    onChange={showTab}
                    options={[
                      {
                        value: "details",
                        label: "Details",
                        title: "What the selection is, and its code  ]",
                        icon: <PhIcon d={PH.code} className="size-[14px]" />,
                      },
                      {
                        value: "ask",
                        label: "Ask AI",
                        title:
                          "Ask about the contract or the selected piece  A",
                        icon: <PhIcon d={PH.sparkle} className="size-[14px]" />,
                      },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => setSide(false)}
                    aria-label="Hide the panel (Esc)"
                    className="x ml-auto"
                  >
                    ✕
                  </button>
                </div>
                {tab === "ask" ? (
                  // the chat fills the column (aside children are otherwise their own height)
                  <section
                    style={{ flex: "1 1 0", minHeight: 0 }}
                    className="flex flex-col rounded-card border border-border bg-card-grad pt-3 shadow-soft"
                  >
                    <AtlasAsk
                      model={model}
                      selected={selected}
                      thread={thread}
                      focus={askFocus}
                      onSelect={select}
                    />
                  </section>
                ) : selected ? (
                  <>
                    <PieceInspector
                      key={selected}
                      model={model}
                      id={selected}
                      onSelect={select}
                      triage={triage}
                      onAsk={() => showTab("ask")}
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
