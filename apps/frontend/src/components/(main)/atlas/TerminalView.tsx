"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type AtlasModel, buildTerminalSvg } from "@/features/atlas";

type View = { x: number; y: number; k: number };

/** HUD I/O diagram with drag-to-pan, wheel zoom (towards cursor) and double-click reset. */
export function TerminalView({
  model,
  selected,
  onSelect,
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const latest = useRef(view);
  latest.current = view;
  const moved = useRef(false);
  const markup = useMemo(
    () => buildTerminalSvg(model, selected),
    [model, selected],
  );

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const toSvg = (e: { clientX: number; clientY: number }) => {
      const pt = el.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(el.getScreenCTM()?.inverse());
    };
    let drag: { mx: number; my: number; x: number; y: number } | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const m = toSvg(e);
      setView((v) => {
        const k = Math.min(
          4,
          Math.max(0.5, v.k * Math.exp(-e.deltaY * 0.0015)),
        );
        return {
          k,
          x: m.x - ((m.x - v.x) * k) / v.k,
          y: m.y - ((m.y - v.y) * k) / v.k,
        };
      });
    };
    const onDown = (e: PointerEvent) => {
      const m = toSvg(e);
      drag = { mx: m.x, my: m.y, x: latest.current.x, y: latest.current.y };
      moved.current = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const m = toSvg(e);
      const dx = m.x - drag.mx;
      const dy = m.y - drag.my;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      const d = drag;
      setView((v) => ({ ...v, x: d.x + dx, y: d.y + dy }));
    };
    const onUp = () => {
      drag = null;
      setTimeout(() => {
        moved.current = false;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="term">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: canvas-style diagram; every target is also reachable from the 3D view and inspector */}
      <svg
        ref={svg}
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Contract I/O diagram"
        onDoubleClick={() => setView({ x: 0, y: 0, k: 1 })}
        onClick={(e) => {
          if (moved.current) return;
          const g = (e.target as Element).closest("[data-id]");
          onSelect(g ? g.getAttribute("data-id") : null);
        }}
      >
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.k})`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: generated from atlas data, all text and attributes escaped
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </svg>
      <div className="thint">
        drag to pan · scroll to zoom · double-click to reset · click a port to
        trace it
      </div>
    </div>
  );
}
