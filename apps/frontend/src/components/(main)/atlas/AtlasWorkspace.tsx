"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Chip,
  EASE,
  ENTER,
  Panel,
  PH,
  PhIcon,
  SolidityLogo,
  Tabs,
} from "@/components/ui";
import {
  type AtlasSource,
  type AtlasView,
  createAtlasModel,
  useStepSim,
  useTriage,
} from "@/features/atlas";
import { atlasSource } from "@/features/atlas/utils/atlas-source";
import { type RunFile, useShownSource } from "@/features/run";
import { StartHere } from "../onboarding/StartHere";
import { AtlasDashboard } from "./AtlasDashboard";
import { ContractSource } from "./ContractSource";
import { CoverageSummary } from "./CoverageSummary";
import { ExplorerView } from "./ExplorerView";
import { FlowView } from "./flow/FlowView";
import { LabView } from "./lab/LabView";
import { MapView } from "./map/MapView";
import { PieceInspector } from "./PieceInspector";
import { openQuickSearch, QuickSearch } from "./QuickSearch";
import { UnitTray } from "./UnitTray";
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
 * The Atlas (docs/ux/atlas.md): one contract as pictures, views named by the question they
 * answer (VSCode Solidity Auditor's auditor-first names), one flat row with keys 1–5; the
 * right panel follows the selection and hides with ] (Figma UI3's properties panel, A2
 * pin/23925441769073772's closable side panel); search is a visible capsule (A3
 * pin/175640454214056601).
 */
const VIEWS: {
  value: AtlasView;
  label: string;
  title: string;
  icon: string;
}[] = [
  {
    value: "map",
    label: "Overview",
    title: "The whole contract on one sheet  1",
    icon: PH.mapTrifold,
  },
  {
    value: "explorer",
    label: "Layers",
    title: "The contract by layer: entry points, gates, storage, calls  2",
    icon: PH.stack,
  },
  {
    value: "lab",
    label: "Graph",
    title: "What each function reads, writes, calls and emits  3",
    icon: PH.graph,
  },
  {
    value: "flow",
    label: "Paths",
    title: "Each function step by step, with replay  4",
    icon: PH.path,
  },
  {
    value: "scenario",
    label: "Scenarios",
    title: "Write a Foundry test of intended behaviour  5",
    icon: PH.flask,
  },
];

/** Smart-contract visual: overview, layers, graph, paths and scenarios, sharing one selection. */
function AtlasBody({ source }: { source: AtlasSource }) {
  const model = useMemo(() => createAtlasModel(source.data), [source.data]);
  const [view, setView] = useState<AtlasView>("lab");
  const [selected, setSelected] = useState<string | null>(null);
  const [inspector, setInspector] = useState(true);
  const sim = useStepSim(model, view === "flow" ? selected : null);
  const triage = useTriage(model.contract);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest("input, textarea, select, [contenteditable='true'], dialog")
      )
        return;
      if (e.key === "Escape") return setSelected(null);
      if (e.key === "]" || e.code === "BracketRight")
        return setInspector((v) => !v);
      const n = Number(e.key);
      if (n >= 1 && n <= VIEWS.length) setView(VIEWS[n - 1].value);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const icon = (d: string) => <PhIcon d={d} className="size-[15px]" />;
  const stage = (node: ReactNode, cls = "stage") => (
    <motion.section key={view} {...ENTER} className={cls}>
      {node}
    </motion.section>
  );

  return (
    <div className="atlas">
      <header className="flex flex-none items-center gap-2 px-3 pb-2">
        <Tabs
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({
            value: v.value,
            label: v.label,
            title: v.title,
            icon: icon(v.icon),
          }))}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openQuickSearch}
            title="Jump to any function, slot, call, event or finding  / or ⌘K"
            className="hdr-pill sm"
          >
            <PhIcon d={PH.search} className="size-[14px] text-dim" />
            Search pieces
            <span className="kbd">/</span>
          </button>
          <Chip>
            <SolidityLogo className="size-3 text-body" />
            {model.file.split("/").pop()}
          </Chip>
          <Chip>solc {model.compiler}</Chip>
          <Chip tone="bad" dot>
            Findings {model.findings.length}
          </Chip>
          <button
            type="button"
            className="hdr-pill sm"
            aria-pressed={inspector}
            title="Show or hide the inspector  ]"
            onClick={() => setInspector((v) => !v)}
          >
            <PhIcon d={PH.sidebar} className="size-[15px] -scale-x-100" />
            Inspector
          </button>
        </div>
      </header>
      <div className="body">
        {view === "map"
          ? stage(
              <MapView
                model={model}
                selected={selected}
                onSelect={setSelected}
                triage={triage}
              />,
            )
          : view === "explorer"
            ? stage(
                <ExplorerView
                  model={model}
                  selected={selected}
                  onSelect={setSelected}
                />,
              )
            : view === "flow"
              ? stage(
                  <FlowView
                    model={model}
                    selected={selected}
                    onSelect={setSelected}
                    sim={sim}
                  />,
                )
              : stage(
                  <>
                    <LabView
                      model={model}
                      calls={source.calls}
                      proposed={source.proposed}
                      selected={selected}
                      onSelect={setSelected}
                      only={view === "scenario" ? "scenario" : "contract"}
                    />
                    {/* the Graph's list view; Scenarios builds from its own palette */}
                    {view === "lab" && (
                      <UnitTray
                        model={model}
                        selected={selected}
                        onSelect={setSelected}
                        triage={triage}
                      />
                    )}
                  </>,
                  "stage flex flex-col",
                )}
        {/* the inspector follows the selection: a piece's source and details first; with
            nothing selected, the contract's summary, its source last */}
        <AnimatePresence initial={false}>
          {inspector && (
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
                    <ContractSource
                      model={model}
                      selected={selected}
                      sim={sim}
                      onSelect={setSelected}
                    />
                    <PieceInspector
                      key={selected}
                      model={model}
                      id={selected}
                      onSelect={setSelected}
                      triage={triage}
                    />
                  </>
                ) : (
                  <>
                    <CoverageSummary model={model} onSelect={setSelected} />
                    <AtlasDashboard model={model} />
                    <ContractSource
                      model={model}
                      selected={selected}
                      sim={sim}
                      onSelect={setSelected}
                    />
                  </>
                )}
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <QuickSearch model={model} onSelect={setSelected} />
    </div>
  );
}
