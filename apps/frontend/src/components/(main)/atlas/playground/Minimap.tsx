"use client";

import { type RefObject, useEffect, useRef } from "react";
import type { AtlasModel } from "@/features/atlas";
import type { CityScene } from "@/features/atlas/engine/create-city-scene";
import { DOCK_AT } from "@/features/atlas/engine/playground-layer";
import { pieceCoverage } from "@/features/atlas/utils/coverage";
import { unitStatus } from "@/features/atlas/utils/units";

const W = 184;
const H = 140;

/** Top-down minimap: buildings as squares, findings red, untested hatched, token and view; click pans. */
export function Minimap({
  model,
  scene,
  selected,
  onSelect,
}: {
  model: AtlasModel;
  scene: RefObject<CityScene | null>;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sel = useRef(selected);
  sel.current = selected;
  const lots = scene.current?.layout() ?? [];
  const xs = [...lots.map((l) => l.x), DOCK_AT.x];
  const zs = [...lots.map((l) => l.z), DOCK_AT.z];
  const pad = 3;
  const x0 = Math.min(...xs) - pad;
  const z0 = Math.min(...zs) - pad;
  const k = Math.min(
    W / (Math.max(...xs) + pad - x0),
    H / (Math.max(...zs) + pad - z0),
  );
  const toMap = (x: number, z: number) => [(x - x0) * k, (z - z0) * k];
  const lotsKey = lots.length;

  // biome-ignore lint/correctness/useExhaustiveDependencies: layout is fixed per scene (lot count)
  useEffect(() => {
    const g = ref.current?.getContext("2d");
    if (!g) return;
    const hatch = document.createElement("canvas");
    hatch.width = hatch.height = 6;
    const h = hatch.getContext("2d") as CanvasRenderingContext2D;
    h.strokeStyle = "#ff4545";
    h.beginPath();
    h.moveTo(0, 6);
    h.lineTo(6, 0);
    h.stroke();
    const hatchFill = g.createPattern(hatch, "repeat") as CanvasPattern;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 100) return; // 10 fps is plenty for a minimap
      last = now;
      g.clearRect(0, 0, W, H);
      for (const l of lots) {
        const [x, y] = toMap(l.x - l.w / 2, l.z - l.d / 2);
        const w = Math.max(2, l.w * k);
        const d = Math.max(2, l.d * k);
        const bad = unitStatus(model, l.id) === "finding";
        g.fillStyle = bad ? "rgba(255,69,69,0.55)" : "#3a3e44";
        g.fillRect(x, y, w, d);
        if (pieceCoverage(model, l.id)?.state === "untested") {
          g.fillStyle = hatchFill;
          g.fillRect(x, y, w, d);
        }
        if (l.id === sel.current) {
          g.strokeStyle = "#ffffff";
          g.strokeRect(x - 1.5, y - 1.5, w + 3, d + 3);
        }
      }
      const s = scene.current;
      const v = s?.viewAt();
      if (v) {
        const [x, y] = toMap(v.x, v.z);
        g.strokeStyle = "#8c9197";
        g.strokeRect(x - 14, y - 10, 28, 20);
      }
      const t = s?.playground.tokenAt();
      if (t) {
        const [x, y] = toMap(t.x, t.z);
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(x, y, 3, 0, Math.PI * 2);
        g.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [lotsKey, model]);

  return (
    <div className="pg-mini relative border border-line bg-shell/90 p-1">
      <span className="absolute top-1 left-1.5 text-[9px] text-dim hud-label">
        Map
      </span>
      <canvas
        ref={ref}
        width={W}
        height={H}
        aria-label="Minimap: click to move the camera, double-click a building to select it"
        className="block cursor-crosshair"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          scene.current?.panTo(
            (e.clientX - r.left) / k + x0,
            (e.clientY - r.top) / k + z0,
          );
        }}
        onDoubleClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - r.left) / k + x0;
          const z = (e.clientY - r.top) / k + z0;
          const hit = lots.find(
            (l) =>
              Math.abs(l.x - x) < l.w / 2 + 0.5 &&
              Math.abs(l.z - z) < l.d / 2 + 0.5,
          );
          if (hit) onSelect(hit.id);
        }}
      />
    </div>
  );
}
