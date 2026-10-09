"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FindingsTab } from "@/components/(main)/atlas/FindingsTab";
import { FlowView } from "@/components/(main)/atlas/flow/FlowView";
import { MapView } from "@/components/(main)/atlas/map/MapView";
import { TraceRow } from "@/components/(main)/trace/TraceRow";
import { useStepSim, useTriage } from "@/features/atlas";
import type { AtlasData } from "@/features/atlas/types";
import { contractGraph } from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import type { Frame } from "@/features/trace";
import { LabGraph } from "./FeatureWidgets";
import type { LabDemo } from "./stats";
import { Window } from "./Window";
import "@/components/(main)/atlas/atlas.css";

const VIEWS = [
  { id: "lab", route: "/atlas · Lab", label: "Lab" },
  { id: "scenario", route: "/atlas · Lab · Scenario", label: "Scenario" },
  { id: "trace", route: "/trace", label: "Trace" },
  { id: "flow", route: "/atlas · Flow", label: "Flow" },
  { id: "map", route: "/atlas · Map", label: "Map" },
  { id: "findings", route: "/atlas · Findings", label: "Findings" },
] as const;
const DWELL = 6000;
/** the close-up's own size: big enough that the app runs at 1:1 and is cropped by the window */
const WORLD = { w: 1440, h: 900 };

/**
 * R8 (onorca.dev hero): one pill row of views over the real app, auto-advancing with a progress
 * bar in the active pill; hovering or focusing a pill pauses it, reduced motion turns auto-advance off.
 *
 * R26 (pin 3870349674475850, Alfred workflow editor): the product as a large, crisp close-up,
 * turned and tilted in perspective (now only while it grows in, see ScatterGrow). Every view is the app's own component rendered live on the sample
 * data, at 1:1 (never an image): Lab = the contract graph (contractGraph → LabGraph), Scenario = the Lab's
 * 'Non-owner cannot setOracle' scenario run by runScenario (stats.ts scenarioDemo), Trace = TraceRow,
 * Flow = FlowView, Map = MapView, Findings = FindingsTab. The close-up is a picture of the app, so
 * it takes no pointer input (pan / zoom canvases would otherwise eat the page scroll).
 * Crossfade without ghosting: the outgoing view is gone (200ms) before the incoming one starts.
 */
export function ProductTabs({
  atlas,
  frames,
  scenario,
}: {
  atlas: AtlasData;
  frames: Frame[];
  /** the Lab's "Non-<role> cannot <fn>" scenario, laid out and run on the server */
  scenario: LabDemo | null;
}) {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0);
  const tabs = useRef<HTMLDivElement>(null);
  const model = useMemo(() => createAtlasModel(atlas), [atlas]);
  const graph = useMemo(() => contractGraph(model), [model]);
  const sim = useStepSim(model, null);
  const triage = useTriage(model.contract);
  const view = VIEWS[at];

  useEffect(() => {
    setAuto(!matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `at` / `tick` restart the dwell after every switch
  useEffect(() => {
    if (!auto || paused) return;
    const t = setTimeout(() => {
      // while ScatterGrow still hides the tabs (the window is growing in) stay on the Lab
      if (
        tabs.current &&
        getComputedStyle(tabs.current).visibility === "hidden"
      ) {
        setAt(0);
        setTick((n) => n + 1);
      } else setAt((i) => (i + 1) % VIEWS.length);
    }, DWELL);
    return () => clearTimeout(t);
  }, [at, tick, auto, paused]);

  const maxGas = Math.max(1, ...frames.map((f) => f.gas ?? 0));
  const none = () => {};
  const content: Record<(typeof VIEWS)[number]["id"], ReactNode> = {
    lab: (
      <div className="dot-grid absolute inset-0">
        <div className="absolute top-14 left-16">
          <LabGraph nodes={graph.nodes} wires={graph.wires} />
        </div>
      </div>
    ),
    scenario: (
      <div className="dot-grid absolute inset-0">
        {scenario && (
          // the whole scenario has to stay inside the tilted frame, so it runs a little smaller
          <div className="absolute top-14 left-12 origin-top-left scale-[0.78]">
            <LabGraph
              nodes={scenario.nodes}
              wires={scenario.wires}
              runs={scenario.runs}
              fields={scenario.fields}
            />
          </div>
        )}
      </div>
    ),
    trace: (
      <div className="dot-grid absolute inset-0 p-10">
        <div className="w-[820px] rounded-card border border-border bg-card-grad p-2 shadow-soft">
          {frames.map((f, i) => (
            <TraceRow
              key={`${i}${f.fn}`}
              index={i}
              frame={f}
              maxGas={maxGas}
              order={i}
              selected={i === 1}
              onSelect={none}
            />
          ))}
        </div>
      </div>
    ),
    flow: (
      <div className="atlas absolute inset-0">
        <section className="stage h-full">
          <FlowView model={model} selected={null} onSelect={none} sim={sim} />
        </section>
      </div>
    ),
    map: (
      <div className="atlas absolute inset-0">
        <section className="stage h-full">
          <MapView
            model={model}
            selected={null}
            onSelect={none}
            triage={triage}
          />
        </section>
      </div>
    ),
    findings: (
      <div className="dot-grid absolute inset-0 p-10">
        <div className="w-[880px]">
          <FindingsTab
            model={model}
            triage={triage}
            selected={model.findings[0]?.id ?? null}
            onSelect={none}
          />
        </div>
      </div>
    ),
  };

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div
        ref={tabs}
        role="tablist"
        aria-label="Luora views"
        data-lp="tabs"
        className="relative z-10 mb-6 flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-white/[.08] bg-[#0b0b0c]/90 p-1"
      >
        {VIEWS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-controls="lp-shot"
            onClick={() => setAt(i)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={`relative overflow-hidden whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              i === at ? "bg-white/[.09] text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {s.label}
            {i === at && auto && (
              <span
                key={`${at}-${paused}`}
                aria-hidden="true"
                className="lp-progress absolute inset-x-3 bottom-0.5 h-px bg-white/50"
                style={
                  {
                    "--t": `${DWELL}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  } as React.CSSProperties
                }
              />
            )}
          </button>
        ))}
      </div>
      {/* R26: a large, crisp close-up of the live app; on lg+ ScatterGrow grows it out of a square,
          tilted in perspective on the way in. The world runs at 1:1 (0.6 on phones) and is cropped. */}
      <div
        id="lp-shot"
        role="tabpanel"
        data-lp="frame"
        aria-label={`${view.label}: the ${view.label} view of the sample LuoraVault audit, live`}
        className="lp-shot pointer-events-none relative h-[440px] w-full max-w-[1180px] select-none md:h-[620px]"
      >
        <Window
          tab={view.label}
          aside={view.route}
          className="flex h-full flex-col text-left"
        >
          <div className="relative min-h-0 flex-1 overflow-hidden bg-canvas">
            <div
              className="absolute top-0 left-0 origin-top-left max-md:scale-[0.6]"
              style={{ width: WORLD.w, height: WORLD.h }}
            >
              {VIEWS.map((s, i) => (
                <div
                  key={s.id}
                  inert
                  aria-hidden={i !== at}
                  className={`absolute inset-0 transition-opacity ease-out motion-reduce:transition-none ${
                    i === at
                      ? "opacity-100 delay-200 duration-300"
                      : "opacity-0 duration-200"
                  }`}
                >
                  {content[s.id]}
                </div>
              ))}
            </div>
          </div>
        </Window>
        <div aria-hidden="true" data-lp="square" className="lp-square" />
      </div>
    </div>
  );
}
