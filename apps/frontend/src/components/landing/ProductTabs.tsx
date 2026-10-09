"use client";

import dynamic from "next/dynamic";
import { startTransition, useEffect, useRef, useState } from "react";
import type { Frame } from "@/features/trace";
import { useAtlas } from "./atlas";
import type { LabDemo } from "./stats";
import { Window } from "./Window";

// the views (and the atlas code they run on) are their own chunk, fetched once the tabs come near
const Views = dynamic(() => import("./ProductViews").then((m) => m.Views));

const VIEWS = [
  { id: "lab", route: "/atlas · Lab", label: "Lab" },
  { id: "scenario", route: "/atlas · Lab · Scenario", label: "Scenario" },
  { id: "trace", route: "/trace", label: "Trace" },
  { id: "flow", route: "/atlas · Flow", label: "Flow" },
  { id: "map", route: "/atlas · Map", label: "Map" },
  { id: "findings", route: "/atlas · Findings", label: "Findings" },
] as const;
export type ViewId = (typeof VIEWS)[number]["id"];
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
 * Only views already shown (and the one after the active view, so it is ready) are mounted, and
 * none before the section comes near the screen: the server HTML carries the frame alone.
 */
export function ProductTabs({
  frames,
  scenario,
}: {
  frames: Frame[];
  /** the Lab's "Non-<role> cannot <fn>" scenario, laid out and run on the server */
  scenario: LabDemo | null;
}) {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0);
  const tabs = useRef<HTMLDivElement>(null);
  const atlas = useAtlas();
  const view = VIEWS[at];
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  // the section sits below the fold (and its window starts clipped to a square): views mount once
  // it comes near the screen, then the one after the active view stays mounted so it fades in ready
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = tabs.current;
    if (near || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) startTransition(() => setNear(true));
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  // off screen the tabs hold still: no dwell timer, no progress animation, no view remounting
  // under some other section (it used to cycle Flow / Map forever, 60 style recalcs a second)
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = tabs.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const hold = paused || !shown;
  useEffect(() => {
    if (!near) return;
    // transitions, so building a view yields to scrolling instead of one long task; the active
    // view first, the next one a little later (it has the whole dwell before it shows)
    const add = (i: number) =>
      startTransition(() =>
        setSeen((s) => (s.has(i) ? s : new Set([...s, i]))),
      );
    add(at);
    const t = setTimeout(() => add((at + 1) % VIEWS.length), 1500);
    return () => clearTimeout(t);
  }, [at, near]);

  useEffect(() => {
    setAuto(!matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `at` / `tick` restart the dwell after every switch
  useEffect(() => {
    // no auto-advance before the section is near: arrive on the Lab, never on an unbuilt view
    if (!auto || hold || !near) return;
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
  }, [at, tick, auto, hold, near]);

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
                key={`${at}-${hold}`}
                aria-hidden="true"
                className="lp-progress absolute inset-x-3 bottom-0.5 h-px bg-white/50"
                style={
                  {
                    "--t": `${DWELL}ms`,
                    animationPlayState: hold ? "paused" : "running",
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
              {atlas && (
                <Views
                  ids={VIEWS.map((v) => v.id)}
                  atlas={atlas}
                  frames={frames}
                  scenario={scenario}
                  at={at}
                  seen={seen}
                />
              )}
            </div>
          </div>
        </Window>
        <div aria-hidden="true" data-lp="square" className="lp-square" />
      </div>
    </div>
  );
}
