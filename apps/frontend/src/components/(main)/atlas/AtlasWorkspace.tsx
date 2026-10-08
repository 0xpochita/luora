"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Tabs } from "@/components/ui";
import {
  type AtlasSource,
  type AtlasView,
  createAtlasModel,
  useCitySim,
  useTriage,
} from "@/features/atlas";
import { AtlasDashboard } from "./AtlasDashboard";
import { CityStage } from "./CityStage";
import { ContractSource } from "./ContractSource";
import { CoverageSummary } from "./CoverageSummary";
import { ExplorerView } from "./ExplorerView";
import { MapView } from "./map/MapView";
import { PieceInspector } from "./PieceInspector";
import { QuickSearch } from "./QuickSearch";
import "./atlas.css";

/** Smart-contract visual: 3D city + radial explorer, sharing one selection. */
export function AtlasWorkspace({ source }: { source: AtlasSource }) {
  const model = useMemo(() => createAtlasModel(source.data), [source.data]);
  const [view, setView] = useState<AtlasView>("city");
  const [selected, setSelected] = useState<string | null>(null);
  const sim = useCitySim(model, view === "city" ? selected : null);
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
      <header className="flex flex-none items-end gap-2 border-line border-b px-2">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: "city", label: "City" },
            { value: "explorer", label: "Explorer" },
            { value: "map", label: "Map" },
          ]}
        />
        <div className="ml-auto flex items-center gap-2 self-center">
          <span className="text-dim hud-label">/ or ⌘K search</span>
          <Chip>{model.file.split("/").pop()}</Chip>
          <Chip>solc {model.compiler}</Chip>
          {source.origin === "sample" && <Chip>Sample</Chip>}
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
        ) : (
          <CityStage
            model={model}
            selected={selected}
            onSelect={setSelected}
            sim={sim}
            triage={triage}
          />
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
