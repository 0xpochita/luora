"use client";

import { useRef } from "react";
import { type Gsap, MOTION_MQ, useStage } from "./motion";

export type DriftTest = { name: string; suite: string; ok: boolean };

/**
 * Genie: two rows of testimonial cards drifting sideways in opposite directions with the scroll.
 * No quotes here: the rows are the sample run's real forge tests (suite, name, pass / fail dot).
 */
function testDrift(root: HTMLElement, gsap: Gsap) {
  gsap.utils.toArray<HTMLElement>("[data-lp=drift]", root).forEach((row, i) => {
    gsap.fromTo(
      row,
      { xPercent: i % 2 ? -30 : 0 },
      {
        xPercent: i % 2 ? 0 : -30,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
}

function Pill({ t }: { t: DriftTest }) {
  return (
    <li className="flex flex-none items-center gap-3 rounded-card border border-border bg-card-grad px-4 py-3 shadow-soft">
      <span
        className={`size-1.5 flex-none rounded-full ${t.ok ? "bg-green" : "bg-red"}`}
      />
      <span className="font-mono text-[13px] text-fg">{t.name}</span>
      <span className="text-[12.5px] text-dim">{t.suite}</span>
    </li>
  );
}

export function TestDrift({ tests }: { tests: DriftTest[] }) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, testDrift, MOTION_MQ);
  const half = Math.ceil(tests.length / 2);
  // each row repeats its tests so the drift never runs out of pills
  const rows = [tests.slice(0, half), tests.slice(half)].map((r) => [
    ...r,
    ...r,
    ...r,
  ]);
  return (
    <section
      ref={ref}
      data-tone="tests"
      aria-label={`The ${tests.length} forge tests of the sample run`}
      className="overflow-hidden py-24 md:py-32"
    >
      <p className="mb-8 px-4 text-center text-[13px] text-dim">
        {tests.length} forge tests traced in the sample run
      </p>
      <div className="flex flex-col gap-3" aria-hidden="true">
        {rows.map((r, i) => (
          <ul
            // biome-ignore lint/suspicious/noArrayIndexKey: two fixed rows
            key={i}
            data-lp="drift"
            className={`flex w-max gap-3 ${i % 2 ? "-ml-[20vw]" : "ml-[4vw]"}`}
          >
            {r.map((t, k) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the row repeats on purpose
              <Pill key={k} t={t} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
