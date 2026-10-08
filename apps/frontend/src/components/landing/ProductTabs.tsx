"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Window } from "./Window";

const SHOTS = [
  {
    id: "lab",
    route: "/atlas · Lab",
    label: "Lab",
    src: "/landing/hero-lab.webp",
    alt: "Luora Lab: the LuoraVault contract graph with deposit and withdraw wired to storage slots and external contracts, forge coverage and the audit focus list on the right.",
  },
  {
    id: "trace",
    route: "/trace",
    label: "Trace",
    src: "/landing/hero-trace.webp",
    alt: "Luora trace view of test_depositThenWithdraw with decoded frames and the contract source.",
  },
  {
    id: "flow",
    route: "/atlas · Flow",
    label: "Flow",
    src: "/landing/hero-flow.webp",
    alt: "Flow view: every entry point of LuoraVault as a row of checks, reads, external calls and writes, with reverts and findings marked.",
  },
  {
    id: "map",
    route: "/atlas · Map",
    label: "Map",
    src: "/landing/hero-map.webp",
    alt: "Map view: the contract hub with entry points, storage, external dependencies, events and the findings list.",
  },
  {
    id: "findings",
    route: "/atlas · Findings",
    label: "Findings",
    src: "/landing/hero-findings.webp",
    alt: "Findings tray with tool and severity filters and finding cards, F-01 External call before state update open in the inspector next to its flagged source lines.",
  },
];
const DWELL = 6000;

/**
 * R8 (onorca.dev hero): one pill row of views over the real app, auto-advancing with a progress
 * bar in the active pill; hovering or focusing a pill pauses it, reduced motion turns auto-advance off.
 * R20 frame + beam, R16 window chrome (see below). Captures: the app's content area only (no app
 * header or sub-tabs), sample data, 1280×720 CSS px at 2× (Playwright), public/landing/hero-*.webp.
 */
export function ProductTabs() {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const shot = SHOTS[at];

  useEffect(() => {
    setAuto(!matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `at` restarts the dwell after every switch
  useEffect(() => {
    if (!auto || paused) return;
    const t = setTimeout(() => setAt((i) => (i + 1) % SHOTS.length), DWELL);
    return () => clearTimeout(t);
  }, [at, auto, paused]);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        role="tablist"
        aria-label="Luora views"
        className="relative z-10 mb-6 flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-white/[.08] bg-[#0b0b0c]/90 p-1"
      >
        {SHOTS.map((s, i) => (
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
      {/* R20 (pin 672232681926990953, Echo): the UI sits crisp and flat under the headline; one soft
          monochrome beam comes down from the upper right and lights a short stretch of its top edge */}
      <div id="lp-shot" role="tabpanel" className="relative w-full">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[16%] bottom-full h-[260px] w-[80px] origin-bottom rotate-[28deg] bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,.28))] blur-[14px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-[8%] z-10 h-12 w-[34%] rounded-full bg-white/[.09] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-px right-[10%] z-10 h-px w-[30%] bg-[linear-gradient(to_right,transparent,rgba(255,255,255,.85),transparent)]"
        />
        {/* R16: one window chrome; the open view is the window's tab. Subtle bottom fade only. */}
        <Window
          tab={shot.label}
          aside={shot.route}
          className="text-left [mask-image:linear-gradient(to_bottom,#000_80%,rgba(0,0,0,.3))]"
        >
          {/* every capture is 2320×1305 (16:9), so switching never changes the frame size */}
          <div className="relative aspect-[16/9] w-full bg-canvas">
            {SHOTS.map((s, i) => (
              <Image
                key={s.id}
                src={s.src}
                alt={s.alt}
                fill
                sizes="(min-width: 1200px) 1160px, 100vw"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                aria-hidden={i !== at}
                // no ghosting: the outgoing view is gone (200ms) before the incoming one starts
                className={`object-cover transition-opacity ease-out motion-reduce:transition-none ${
                  i === at
                    ? "opacity-100 delay-200 duration-300"
                    : "opacity-0 duration-200"
                }`}
              />
            ))}
          </div>
        </Window>
      </div>
    </div>
  );
}
