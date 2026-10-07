"use client";

import { useEffect, useState } from "react";
import { Chip, Tabs } from "@/components/ui";
import { type AtlasView, FINDINGS } from "@/features/atlas";
import { AtlasDashboard } from "./AtlasDashboard";
import { AtlasStage } from "./AtlasStage";
import { PieceInspector } from "./PieceInspector";
import { TerminalView } from "./TerminalView";
import "./atlas.css";

/** Smart-contract visual: 3D layered atlas + terminal I/O HUD, sharing one selection. */
export function AtlasWorkspace() {
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
          <Chip>LuoraVault.sol</Chip>
          <Chip>solc 0.8.20</Chip>
          <Chip tone="bad" dot>
            Findings {FINDINGS.length}
          </Chip>
        </div>
      </header>
      <div className="body">
        <AtlasStage selected={selected} onSelect={setSelected}>
          {view === "terminal" && (
            <TerminalView selected={selected} onSelect={setSelected} />
          )}
        </AtlasStage>
        <aside>
          {selected ? (
            <PieceInspector
              key={selected}
              id={selected}
              onSelect={setSelected}
            />
          ) : (
            <AtlasDashboard />
          )}
        </aside>
      </div>
    </div>
  );
}
