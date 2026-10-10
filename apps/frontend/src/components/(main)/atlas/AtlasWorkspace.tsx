"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Panel, Tabs } from "@/components/ui";
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
import { QuickSearch } from "./QuickSearch";
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

/** Smart-contract visual: Lab node editor, explorer, map and flow, sharing one selection. */
function AtlasBody({ source }: { source: AtlasSource }) {
  const model = useMemo(() => createAtlasModel(source.data), [source.data]);
  const [view, setView] = useState<AtlasView>("lab");
  const [selected, setSelected] = useState<string | null>(null);
  const sim = useStepSim(model, view === "flow" ? selected : null);
  const triage = useTriage(model.contract);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="atlas">
      <header className="flex flex-none items-center gap-2 px-3 pb-2">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: "lab", label: "Lab" },
            { value: "explorer", label: "Explorer" },
            { value: "map", label: "Map" },
            { value: "flow", label: "Flow" },
          ]}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 text-dim ui-label">/ or ⌘K search</span>
          <Chip>{model.file.split("/").pop()}</Chip>
          <Chip>solc {model.compiler}</Chip>
          <Chip tone="bad" dot>
            Findings {model.findings.length}
          </Chip>
        </div>
      </header>
      <div className="body">
        {view === "map" ? (
          <section className="stage">
            <MapView
              model={model}
              selected={selected}
              onSelect={setSelected}
              triage={triage}
            />
          </section>
        ) : view === "explorer" ? (
          <section className="stage">
            <ExplorerView
              model={model}
              selected={selected}
              onSelect={setSelected}
            />
          </section>
        ) : view === "flow" ? (
          <section className="stage">
            <FlowView
              model={model}
              selected={selected}
              onSelect={setSelected}
              sim={sim}
            />
          </section>
        ) : (
          <section className="stage flex flex-col">
            <LabView
              model={model}
              calls={source.calls}
              proposed={source.proposed}
              selected={selected}
              onSelect={setSelected}
            />
            <UnitTray
              model={model}
              selected={selected}
              onSelect={setSelected}
              triage={triage}
            />
          </section>
        )}
        <aside>
          <ContractSource
            model={model}
            selected={selected}
            sim={sim}
            onSelect={setSelected}
          />
          {selected ? (
            <PieceInspector
              key={selected}
              model={model}
              id={selected}
              onSelect={setSelected}
              triage={triage}
            />
          ) : (
            <>
              <CoverageSummary model={model} onSelect={setSelected} />
              <AtlasDashboard model={model} />
            </>
          )}
        </aside>
      </div>
      <QuickSearch model={model} onSelect={setSelected} />
    </div>
  );
}
