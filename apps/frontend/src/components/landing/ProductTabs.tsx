"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SHOTS = [
  {
    id: "lab",
    label: "Lab",
    src: "/landing/hero-lab.webp",
    alt: "Luora Lab: the LuoraVault contract graph with deposit and withdraw wired to storage slots and external contracts, forge coverage on the right.",
  },
  {
    id: "trace",
    label: "Trace",
    src: "/landing/hero-trace.webp",
    alt: "Luora trace view of test_depositThenWithdraw with decoded frames and the contract source.",
  },
  {
    id: "flow",
    label: "Flow",
    src: "/landing/hero-flow.webp",
    alt: "Flow view: every entry point of LuoraVault as a row of checks, reads, external calls and writes, with reverts and findings marked.",
  },
  {
    id: "map",
    label: "Map",
    src: "/landing/hero-map.webp",
    alt: "Map view: the contract hub with entry points, storage, external dependencies, events and the findings list.",
  },
  {
    id: "findings",
    label: "Findings",
    src: "/landing/hero-findings.webp",
    alt: "Findings tray with Slither, Aderyn and manual filters, and F-01 open in the inspector next to its flagged source lines.",
  },
];
const DWELL = 6000;

/**
 * R8 (onorca.dev hero): one pill row of views over the real app, auto-advancing with a progress
 * bar in the active pill; hovering or focusing a pill pauses it, reduced motion turns auto-advance off.
 */
export function ProductTabs() {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);

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
      <div
        id="lp-shot"
        role="tabpanel"
        className="relative w-full [mask-image:linear-gradient(to_bottom,#000_30%,transparent_88%)]"
      >
        <div className="lp-tilt overflow-hidden rounded-[20px] border border-white/[.09] bg-white/[.02] p-1.5 shadow-[0_-20px_80px_rgba(255,255,255,0.05)] md:p-2">
          <div className="relative aspect-[16/10] w-[220%] overflow-hidden rounded-[14px] md:w-full">
            {SHOTS.map((s, i) => (
              <Image
                key={s.id}
                src={s.src}
                alt={s.alt}
                fill
                sizes="(min-width: 1200px) 1160px, (min-width: 768px) 100vw, 220vw"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                aria-hidden={i !== at}
                className={`object-cover object-left-top transition-[opacity,transform] duration-700 ease-out ${
                  i === at ? "opacity-100" : "scale-[1.01] opacity-0"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
