"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, SegmentedControl, ToggleChip } from "@/components/ui";
import {
  type AtlasScene,
  type CamView,
  LAYERS,
  type LayerKey,
  layerOf,
  PIECES,
} from "@/features/atlas";

const CAMS: { value: CamView; label: string; title: string }[] = [
  { value: "iso", label: "ISO", title: "Isometric" },
  { value: "front", label: "FRT", title: "Front" },
  { value: "top", label: "TOP", title: "Top" },
];

/** 3D pyramid view. The three.js engine is loaded client-side only and driven through a small API. */
export function AtlasStage({
  selected,
  onSelect,
  children,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scene = useRef<AtlasScene | null>(null);
  const pick = useRef(onSelect);
  pick.current = onSelect;
  const [hidden, setHidden] = useState<Set<LayerKey>>(new Set());
  const [spread, setSpread] = useState(0);
  const [cam, setCam] = useState<CamView>("iso");
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    let alive = true;
    import("@/features/atlas/engine/create-atlas-scene").then(
      ({ createAtlasScene }) => {
        if (!alive || !ref.current) return;
        scene.current = createAtlasScene(ref.current, (id) => pick.current(id));
      },
    );
    return () => {
      alive = false;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => scene.current?.select(selected), [selected]);
  useEffect(() => scene.current?.setHiddenLayers(hidden), [hidden]);
  useEffect(() => scene.current?.setSpread(spread / 100), [spread]);
  useEffect(() => scene.current?.setAutoRotate(spin), [spin]);

  const toggleLayer = (k: LayerKey) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <section className="stage" ref={ref}>
      <div className="legend">
        {LAYERS.map((L) => (
          <button
            type="button"
            key={L.key}
            className={`lay ${hidden.has(L.key) ? "off" : ""}`}
            style={{ "--c": L.color } as React.CSSProperties}
            onClick={() => toggleLayer(L.key)}
          >
            <div className="nm">
              <i />
              {L.name} layer
            </div>
            <div className="ct">
              {String(
                PIECES.filter((p) => p.sys !== "vulns" && layerOf(p) === L)
                  .length,
              ).padStart(2, "0")}
            </div>
            <div className="sb">{L.sub}</div>
          </button>
        ))}
      </div>
      <div className="views">
        <SegmentedControl
          value={cam}
          options={CAMS}
          onChange={(v) => {
            setCam(v);
            scene.current?.setCamera(v);
          }}
        />
        <ToggleChip
          label="Rotate"
          on={spin}
          onToggle={() => setSpin((s) => !s)}
        />
      </div>
      <Panel label="Layer spacing" aside={`${spread}%`} className="spread">
        <input
          type="range"
          min={0}
          max={100}
          value={spread}
          aria-label="Layer spacing"
          onChange={(e) => setSpread(+e.target.value)}
        />
      </Panel>
      <div className="hint">
        drag to orbit · scroll to zoom · click a node to isolate it
      </div>
      {children}
    </section>
  );
}
