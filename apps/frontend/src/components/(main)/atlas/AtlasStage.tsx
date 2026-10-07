"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AtlasScene,
  type CamView,
  LAYERS,
  type LayerKey,
  layerOf,
  PIECES,
} from "@/features/atlas";

const CAMS: { v: CamView; label: string; title: string }[] = [
  { v: "iso", label: "¾", title: "Isometric" },
  { v: "front", label: "F", title: "Front" },
  { v: "top", label: "T", title: "Top" },
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
            <div className="hx">
              <b />
            </div>
            <div className="nm">{L.name} layer</div>
            <div className="ct">
              {
                PIECES.filter((p) => p.sys !== "vulns" && layerOf(p) === L)
                  .length
              }
            </div>
            <div className="sb">{L.sub}</div>
          </button>
        ))}
      </div>
      <div className="views">
        {CAMS.map((c) => (
          <button
            type="button"
            key={c.v}
            title={c.title}
            className={cam === c.v ? "on" : ""}
            onClick={() => {
              setCam(c.v);
              scene.current?.setCamera(c.v);
            }}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          title="Auto-rotate"
          className={spin ? "on" : ""}
          onClick={() => setSpin((s) => !s)}
        >
          ⟳
        </button>
      </div>
      <div className="spread">
        <div className="row">
          <span>Layer spacing</span>
          <span>{spread}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={spread}
          onChange={(e) => setSpread(+e.target.value)}
        />
      </div>
      <div className="hint">
        drag to orbit · scroll to zoom · click a node to isolate it
      </div>
      {children}
    </section>
  );
}
