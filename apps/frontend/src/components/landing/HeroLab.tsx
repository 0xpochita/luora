"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PH, PhIcon } from "@/components/ui";
import "@/components/(main)/shell/header.css";
import type { GNode, Wire } from "@/features/atlas/utils/lab-graph";
import { LabGraph } from "./LabGraph";
import type { LabDemo } from "./stats";

const DWELL = 6500;
// the Atlas views it shows, by their names in the app (docs/ux/atlas.md D1)
const TABS = ["Graph", "Scenarios"] as const;

/**
 * The hero's Lab window: the two things Luora is for, drawn by the app's own Lab cards on the
 * sample run. Contract = the contract graph (contractGraph: functions wired to the slots, calls
 * and events they touch), Scenario = the 'Non-owner cannot setOracle' scenario as run by
 * runScenario, with the Lab's run bar under it. The app's Contract | Scenario switch flips
 * between them on its own every few seconds (paused on hover, focus, off screen, a hidden tab
 * and under reduced motion) and on click. Both views are in the server HTML; only opacity moves.
 */
export function HeroLab({
  contract,
  scenario,
}: {
  contract: { nodes: GNode[]; wires: Wire[] };
  scenario: LabDemo | null;
}) {
  const [tab, setTab] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || !scenario) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let seen = true;
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
    });
    io.observe(el);
    const t = window.setInterval(() => {
      if (
        reduce.matches ||
        !seen ||
        document.hidden ||
        el.matches(":hover, :focus-within")
      )
        return;
      setTab((x) => 1 - x);
    }, DWELL);
    return () => {
      clearInterval(t);
      io.disconnect();
    };
  }, [scenario]);

  const view = (i: number) =>
    `absolute inset-0 transition-opacity duration-700 ${tab === i ? "opacity-100" : "pointer-events-none opacity-0"}`;

  return (
    <div
      ref={root}
      className="dot-grid relative h-full overflow-hidden rounded-t-[24px] border border-white/[.08] border-b-0 bg-[#0b0b0d]"
    >
      {/* LB: one soft light over the canvas, as the ref's blur behind its nodes (monochrome) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_78%_0%,rgba(255,255,255,.07),transparent_70%)]"
      />
      {/* the Lab's own top bar: the Contract | Scenario switch, the route, the way in */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 p-3 md:p-4">
        <div
          role="tablist"
          aria-label="Lab view"
          className="flex rounded-full border border-white/[.08] bg-[#141416] p-1 shadow-soft"
        >
          {TABS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tab === i}
              disabled={i === 1 && !scenario}
              onClick={() => setTab(i)}
              className={`h-8 rounded-full px-4 text-[13px] transition-colors ${
                tab === i
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hidden font-mono text-[11.5px] text-dim md:block">
          /atlas · {TABS[tab]}
        </span>
        {/* the app header's Connect AI capsule (header.css .hdr-pill.lit), the graph icon in front */}
        <Link href="/atlas" className="group hdr-pill lit ml-auto">
          <PhIcon
            d={PH.graph}
            className="size-[15px] transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none"
          />
          Open the Atlas
          <PhIcon d={PH.caretRight} className="size-3 text-dim" />
        </Link>
      </div>

      <div aria-hidden={tab !== 0} className={view(0)}>
        <div className="lh-lab-graph absolute top-[76px] left-5 md:left-10">
          <LabGraph nodes={contract.nodes} wires={contract.wires} />
        </div>
      </div>

      {scenario && (
        <div aria-hidden={tab !== 1} className={view(1)}>
          <div className="lh-lab-graph absolute top-[96px] left-5 md:left-12">
            <LabGraph
              nodes={scenario.nodes}
              wires={scenario.wires}
              runs={scenario.runs}
              fields={scenario.fields}
            />
          </div>
          {/* the Lab's run bar: Run (with the run's result), Export .t.sol */}
          <div className="absolute bottom-[clamp(28px,6svh,56px)] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-[16px] border border-white/[.08] bg-[#141416] p-1.5 shadow-float">
            <span className="flex h-9 items-center gap-1.5 rounded-[11px] bg-mint px-4 font-medium text-[13px] text-primary-fg">
              <span aria-hidden="true">▶</span> Run ·{" "}
              {Object.values(scenario.runs).some((r) => r.status === "fail")
                ? "fail"
                : "pass"}
            </span>
            <span className="flex h-9 items-center rounded-[11px] px-3.5 text-[13px] text-text">
              Export .t.sol ↓
            </span>
          </div>
        </div>
      )}

      {/* the window runs off the bottom of the screen, fading into the page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
