"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type View = { k: number; x: number; y: number };

/** Drag-to-pan + wheel-to-zoom for a canvas element. `moved` lets clicks ignore drags. */
export function usePanZoom(
  ref: RefObject<HTMLElement | null>,
  initial: View = { k: 0.9, x: 20, y: 20 },
) {
  const [view, setView] = useState<View>(initial);
  const drag = useRef<{
    sx: number;
    sy: number;
    vx: number;
    vy: number;
  } | null>(null);
  const moved = useRef(false);
  const latest = useRef(view);
  useEffect(() => {
    latest.current = view;
  }, [view]);

  const zoomAt = useCallback(
    (factor: number, mx?: number, my?: number) => {
      const el = ref.current;
      if (!el) return;
      setView((v) => {
        const cx = mx ?? el.clientWidth / 2;
        const cy = my ?? el.clientHeight / 2;
        const k = Math.min(2.5, Math.max(0.25, v.k * factor));
        return {
          k,
          x: cx - ((cx - v.x) * k) / v.k,
          y: cy - ((cy - v.y) * k) / v.k,
        };
      });
    },
    [ref],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(
        Math.exp(-e.deltaY * 0.0015),
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
      drag.current = {
        sx: e.clientX,
        sy: e.clientY,
        vx: latest.current.x,
        vy: latest.current.y,
      };
      moved.current = false;
    };
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
      setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
    };
    const onUp = () => {
      drag.current = null;
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
  }, [ref, zoomAt]);

  const fit = useCallback(
    (w: number, h: number) => {
      const el = ref.current;
      if (!el) return;
      const k = Math.min(
        1.1,
        (el.clientWidth - 40) / w,
        (el.clientHeight - 40) / h,
      );
      setView({ k, x: 20, y: Math.max(20, (el.clientHeight - h * k) / 2) });
    },
    [ref],
  );

  return { view, zoomAt, fit, moved };
}
