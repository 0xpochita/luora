"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Tabs } from "@/components/ui";
import {
  type AtlasSource,
  type AtlasView,
  createAtlasModel,
} from "@/features/atlas";
import { AtlasDashboard } from "./AtlasDashboard";
import { AtlasStage } from "./AtlasStage";
import { PieceInspector } from "./PieceInspector";
import { TerminalView } from "./TerminalView";
import "./atlas.css";

/** Smart-contract visual: 3D layered atlas + terminal I/O HUD, sharing one selection. */
export function AtlasWorkspace({ source }: { source: AtlasSource }) {
  const model = useMemo(() => createAtlasModel(source.data), [source.data]);
  const [view, setView] = useState<AtlasView>("atlas");
  const [selected, setSelected] = useState<string | null>(null);

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
            { value: "atlas", label: "Contract atlas" },
            { value: "terminal", label: "Terminal I/O" },
          ]}
        />
        <div className="ml-auto flex items-center gap-2 self-center">
          <Chip>{model.file.split("/").pop()}</Chip>
          <Chip>solc {model.compiler}</Chip>
          {source.origin === "sample" && <Chip>Sample</Chip>}
          <Chip tone="bad" dot>
            Findings {model.findings.length}
          </Chip>
        </div>
      </header>
      <div className="body">
        <AtlasStage model={model} selected={selected} onSelect={setSelected}>
          {view === "terminal" && (
            <TerminalView
              model={model}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </AtlasStage>
        <aside>
          {selected ? (
            <PieceInspector
              key={selected}
              model={model}
              id={selected}
              onSelect={setSelected}
            />
          ) : (
            <AtlasDashboard model={model} origin={source.origin} />
          )}
        </aside>
      </div>
    </div>
  );
}
