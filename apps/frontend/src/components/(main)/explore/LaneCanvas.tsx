"use client";

import { useEffect, useMemo, useRef } from "react";
import { wirePath } from "@/features/atlas/utils/lab-graph";
import { type Flow, LANES, laneLayout } from "@/features/explore";

/*
 * Explore's lane diagram (docs/ux/explore.md):
 *  - P4 pin/10414642884268257 (Workflow plan): steps as numbered pills laid on rows, left to
 *    right; the active one white, the rest graphite
 *  - sequence diagrams: one lane per participant, the actor first; lane names stay put while the
 *    steps scroll under them
 */

const PILL_W = LANES.step - 18;
const PILL_H = 32;

export function LaneCanvas({
  flow: f,
  step,
  onStep,
  kindOf,
  className = "",
}: {
  flow: Pick<Flow, "actor" | "steps">;
  step: number;
  onStep: (i: number) => void;
  /** the second line under a lane's name: what the participant is */
  kindOf: (lane: string) => string;
  className?: string;
}) {
  const L = useMemo(() => laneLayout(f as Flow), [f]);
  const scroller = useRef<HTMLDivElement>(null);

  // keep the selected step in view
  useEffect(() => {
    const el = scroller.current;
    const x = L.steps[step]?.x;
    if (!el || x == null) return;
    if (
      x < el.scrollLeft + LANES.label ||
      x + PILL_W > el.scrollLeft + el.clientWidth
    )
      el.scrollTo({ left: x - LANES.label - 24, behavior: "smooth" });
  }, [step, L]);

  return (
    <div className={`relative ${className}`}>
      {L.lanes.map((lane, i) => (
        <div
          key={lane}
          className="absolute left-0 z-[2] flex flex-col justify-center bg-canvas/90 pr-3 pl-4"
          style={{
            top: LANES.top + i * LANES.lane,
            height: LANES.lane,
            width: LANES.label - 16,
          }}
        >
          <span className="truncate text-[13px] text-fg">{lane}</span>
          <span className="truncate text-[12px] text-dim" title={kindOf(lane)}>
            {kindOf(lane)}
          </span>
        </div>
      ))}
      <div
        ref={scroller}
        className="overflow-x-auto"
        style={{ height: L.h + 12 }}
      >
        <div className="relative" style={{ width: L.w + 24, height: L.h }}>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={L.w}
            height={L.h}
          >
            {L.lanes.map((lane, i) => (
              <line
                key={lane}
                x1={LANES.label - 12}
                x2={L.w}
                y1={LANES.top + i * LANES.lane + LANES.lane / 2}
                y2={LANES.top + i * LANES.lane + LANES.lane / 2}
                stroke="var(--border)"
              />
            ))}
            {L.steps.slice(1).map((b, i) => {
              const a = L.steps[i];
              const on = i + 1 === step || i === step;
              return (
                <path
                  key={b.i}
                  d={wirePath(
                    { x: a.x + PILL_W, y: a.y + LANES.lane / 2 },
                    { x: b.x, y: b.y + LANES.lane / 2 },
                  )}
                  fill="none"
                  stroke={on ? "var(--wire-on)" : "var(--wire)"}
                  opacity={on ? 1 : 0.5}
                />
              );
            })}
          </svg>
          {L.steps.map((at) => {
            const x = f.steps[at.i];
            const on = at.i === step;
            return (
              <button
                key={at.i}
                type="button"
                onClick={() => onStep(at.i)}
                title={x.say}
                aria-current={on ? "step" : undefined}
                className={`absolute flex items-center gap-2 rounded-full px-3 text-left text-[12.5px] transition-colors ${on ? "bg-primary text-primary-fg shadow-soft" : "bg-raised text-text hover:bg-hover"}`}
                style={{
                  left: at.x,
                  top: at.y + (LANES.lane - PILL_H) / 2,
                  width: PILL_W,
                  height: PILL_H,
                }}
              >
                <span className={`font-mono ${on ? "" : "text-dim"}`}>
                  {at.i + 1}
                </span>
                <span className="truncate">{x.fn ?? "starts"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
