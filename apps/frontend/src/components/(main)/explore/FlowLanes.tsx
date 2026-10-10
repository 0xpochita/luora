"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { Chevron, Dropdown, ENTER, PH, PhIcon } from "@/components/ui";
import { wirePath } from "@/features/atlas/utils/lab-graph";
import {
  githubUrl,
  LANES,
  laneLayout,
  type Protocol,
} from "@/features/explore";

/*
 * A business flow as a lane diagram (docs/ux/explore.md, Decisions):
 *  - P4 pin/10414642884268257 (Workflow plan): steps as pills laid on rows, left to right; the
 *    active one white, the rest graphite
 *  - sequence diagrams: one lane per participant, the actor first
 *  - P5 pin/669206825922691039 (BPMN, documentation panel) and Tenderly's Next / Previous: the
 *    selected step's explanation and its line under the diagram; ← → or j k step
 * Text reads as "<lane>.<function>": the protocol's own names, from the code at the pinned commit.
 */

const PILL_W = LANES.step - 18;
const PILL_H = 32;

export function FlowLanes({
  protocol: p,
  flow: id,
  step,
  onFlow,
  onStep,
}: {
  protocol: Protocol;
  flow: string;
  step: number;
  onFlow: (id: string) => void;
  onStep: (i: number) => void;
}) {
  const f = p.flows.find((x) => x.id === id) ?? p.flows[0];
  const L = useMemo(() => laneLayout(f), [f]);
  const s = f.steps[step] ?? f.steps[0];
  const scroller = useRef<HTMLDivElement>(null);
  const kindOf = (lane: string) => {
    if (lane === f.actor) return "Starts the flow";
    const c = p.contracts.find((x) => x.name === lane);
    if (c) return c.kind === "library" ? "Library" : "Contract";
    return p.externals.find((x) => x.name === lane)?.label ?? "Outside";
  };

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

  const url = githubUrl(p, s.repo, s.file, s.line);
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-3">
        <Dropdown
          ariaLabel="Flow"
          variant="pill"
          value={f.id}
          onChange={onFlow}
          options={p.flows.map((x) => ({
            value: x.id,
            label: x.title,
            title: x.summary,
          }))}
        />
        <p className="min-w-0 truncate text-[13px] text-muted">{f.summary}</p>
      </div>

      <div className="relative mt-3">
        {/* lane names stay put while the steps scroll under them */}
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
            <span className="truncate text-[12px] text-dim">
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

      {/* the selected step, readable without opening a panel */}
      <motion.section
        key={`${f.id}-${step}`}
        {...ENTER}
        className="mx-4 mt-2 max-w-[760px] rounded-card border border-border bg-card-grad p-4 shadow-soft"
      >
        <header className="flex items-center gap-2 text-[13px] text-muted">
          <span>
            Step <span className="font-mono text-fg">{step + 1}</span> of{" "}
            <span className="font-mono">{f.steps.length}</span>
          </span>
          <span className="ml-auto flex gap-1.5">
            <button
              type="button"
              className="hdr-pill sm"
              disabled={step === 0}
              onClick={() => onStep(step - 1)}
              title="Previous step  ←"
            >
              <Chevron className="rotate-180" />
              Previous
            </button>
            <button
              type="button"
              className="hdr-pill sm"
              disabled={step === f.steps.length - 1}
              onClick={() => onStep(step + 1)}
              title="Next step  →"
            >
              Next
              <Chevron />
            </button>
          </span>
        </header>
        <p className="mt-2 font-mono text-[13px] text-fg">
          {s.fn ? `${s.lane}.${s.fn}` : s.lane}
        </p>
        <p className="mt-1.5 text-[14px] text-body leading-relaxed">{s.say}</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-fg"
          >
            <PhIcon d={PH.code} className="size-[13px]" />
            {s.file}:{(s.line ?? 0) + 1} on GitHub
          </a>
        )}
      </motion.section>

      <section className="mx-4 mt-3 mb-6 max-w-[760px] px-1">
        <h2 className="text-[13px] text-muted">What an auditor checks here</h2>
        <ul className="mt-2 space-y-1.5">
          {f.checks.map((c) => (
            <li
              key={c}
              className="flex gap-2.5 text-[13px] text-body leading-normal"
            >
              <span className="mt-[7px] size-1.5 flex-none rounded-full bg-yellow" />
              {c}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
