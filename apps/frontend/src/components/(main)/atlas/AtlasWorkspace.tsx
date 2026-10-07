"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AtlasView } from "@/features/atlas";
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
      <header className="nav">
        <div className="brand">
          <span className="logo">L</span>LUORA
        </div>
        <nav className="tabs">
          <button
            type="button"
            className={view === "atlas" ? "on" : ""}
            onClick={() => setView("atlas")}
          >
            Contract Atlas
          </button>
          <button
            type="button"
            className={view === "terminal" ? "on" : ""}
            onClick={() => setView("terminal")}
          >
            Terminal I/O
          </button>
          <Link href="/trace">Trace</Link>
        </nav>
        <div className="who">
          LuoraVault.sol · solc 0.8.20 <i />
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
