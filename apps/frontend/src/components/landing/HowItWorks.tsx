"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { TestList } from "@/components/(main)/trace/TestList";
import type { AtlasData } from "@/features/atlas/types";
import { ICON_PATH, type IconKey } from "@/features/atlas/utils/icons";
import type { Frame, TestResult } from "@/features/trace";
import {
  CoverageWidget,
  FindingsWidget,
  LabWidget,
  TraceWidget,
} from "./FeatureWidgets";
import {
  IsoStack,
  leaderY,
  STACK_H,
  STACK_W,
  STEP_LABELS,
  type StackData,
} from "./IsoStack";
import type { LabDemo } from "./stats";
import { Window } from "./Window";

type Step = { icon: IconKey; title: string; copy: [string, string] };

const STEPS: Step[] = [
  {
    icon: "cycle",
    title: "Run your tests",
    copy: [
      "Run forge test -vvvv and forge coverage in your Foundry project.",
      "One script, luora-export.mjs, folds both into a JSON file.",
    ],
  },
  {
    icon: "waves",
    title: "Read every frame",
    copy: [
      "Calls, events and cheatcodes decoded with your own ABIs.",
      "Each frame links to the source lines it executed.",
    ],
  },
  {
    icon: "plug",
    title: "Write the test as a graph",
    copy: [
      "Wire actors, calls and expected reverts onto the contract.",
      "Run it in the browser, then export it as a Foundry test.",
    ],
  },
  {
    icon: "warn",
    title: "Triage what is left",
    copy: [
      "Slither and Aderyn merged into one deduplicated list.",
      "Coverage shows the code no test ever touched.",
    ],
  },
];

function Icon({ k, className = "size-4" }: { k: IconKey; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICON_PATH[k]} />
    </svg>
  );
}

/**
 * 'How Luora works': one tall section, a sticky stage and four scroll steps.
 *
 * R22 (pin 774124931585644, Valley Engine): a hairline frame split into columns over a faint grid;
 * numbered steps with small icons in the left column; the exploded plate stack in the middle with
 * the active plate lit; a dashed leader out to an annotation with a thin vertical accent bar sitting
 * on the column divider, an icon, a title and two lines of copy.
 * R23 (pin 246501779599303620, Dante): the stack runs down the centre, the side cells line up with
 * it, small square markers where the cell lines meet the dividers.
 * R25 (pin 700661654577045083, S7 Interface Module 01): one huge index number for the open step.
 * Under the active step the real product, smaller: TestList, TraceWidget, LabWidget, Findings +
 * Coverage (the app's own components on the sample data).
 *
 * IntersectionObserver on four invisible bands picks the step; no animation library. Below lg the
 * stage is not sticky: the stack shows once, then the steps stack with their widgets.
 */
export function HowItWorks({
  stack,
  tests,
  frames,
  test,
  lab,
  atlas,
}: {
  stack: StackData;
  tests: TestResult[];
  frames: Frame[];
  test: string;
  lab: LabDemo | null;
  atlas: AtlasData;
}) {
  const [at, setAt] = useState(0);
  const bands = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting)
            setAt(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const b of bands.current) if (b) io.observe(b);
    return () => io.disconnect();
  }, []);

  const go = (i: number) =>
    bands.current[i]?.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });

  const widgets: ReactNode[] = [
    <Window
      key="run"
      tab="forge test"
      aside={`${tests.length} tests`}
      className="w-full max-w-[460px]"
    >
      <div className="p-2">
        <TestList tests={tests} selected={1} onSelect={() => {}} />
      </div>
    </Window>,
    <TraceWidget key="trace" test={test} frames={frames} />,
    lab && <LabWidget key="lab" {...lab} />,
    <div key="find" className="grid w-full max-w-[460px] gap-3">
      <FindingsWidget atlas={atlas} cards={1} />
      <CoverageWidget atlas={atlas} partly={false} />
    </div>,
  ];

  return (
    <section id="how-it-works" data-tone="how" className="pb-32">
      <div className="mx-auto max-w-[1240px] px-4 md:px-6">
        <p className="flex items-center gap-2 text-[13px] text-text">
          <span className="size-1.5 rounded-full bg-white" />
          How Luora works
        </p>
        <h2 className="mt-4 max-w-[640px] font-medium text-[clamp(30px,3.6vw,44px)] text-fg leading-[1.06] tracking-[-0.025em]">
          Four layers, one local run.
        </h2>
      </div>

      {/* lg+: sticky stage driven by four scroll bands */}
      <div className="relative mt-10 hidden h-[400vh] lg:block">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            ref={(el) => {
              bands.current[i] = el;
            }}
            data-step={i}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-[100vh]"
            style={{ top: `${i * 100}vh` }}
          />
        ))}
        <div className="sticky top-0 h-screen py-6">
          <div className="lp-frame relative mx-auto flex h-full max-w-[1240px] border-white/[.08] border-y">
            {/* left: numbered steps (R22), the open one shows the real UI */}
            <ol
              className="lp-steps grid w-[460px] flex-none border-white/[.08] border-x"
              style={{
                gridTemplateRows: [0, 1, 2, 3]
                  .map((i) => (i === at ? "1fr" : "56px"))
                  .join(" "),
              }}
            >
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="relative min-h-0 overflow-hidden border-white/[.08] border-b last:border-b-0"
                >
                  {/* R23: small square marker where the cell line meets the divider */}
                  <span className="absolute -right-[3px] bottom-0 size-[5px] translate-y-1/2 bg-white/40" />
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === at ? "step" : undefined}
                    className={`flex h-14 w-full items-center gap-3 px-6 text-left transition-colors ${i === at ? "text-fg" : "text-dim hover:text-muted"}`}
                  >
                    <span className="font-mono text-[12.5px]">{`0${i + 1}`}</span>
                    <Icon k={s.icon} />
                    <span className="text-[15px]">{s.title}</span>
                  </button>
                  <div
                    inert={i !== at}
                    className={`flex justify-center px-5 pb-6 transition-opacity duration-500 motion-reduce:transition-none ${i === at ? "opacity-100" : "opacity-0"}`}
                  >
                    {widgets[i]}
                  </div>
                </li>
              ))}
            </ol>

            {/* centre: the exploded stack (R22 / R23 / R24) */}
            <div className="relative h-full flex-none py-6">
              <div
                className="relative h-full"
                style={{ aspectRatio: `${STACK_W} / ${STACK_H}` }}
              >
                <IsoStack data={stack} active={at} />
              </div>
            </div>

            {/* right: annotation on the divider (R22) + huge index (R25) */}
            <div className="relative min-w-0 flex-1 border-white/[.08] border-x py-6">
              <span
                aria-hidden="true"
                className="absolute top-2 right-6 font-light text-[168px] text-white/[.05] leading-none tracking-[-0.06em]"
              >
                {`0${at + 1}`}
              </span>
              <div className="relative h-full">
                <div
                  key={at}
                  className="lp-note lp-fadein absolute left-0 w-full max-w-[300px] -translate-y-1/2 py-8 pr-6 pl-7"
                  style={{ top: `${(leaderY(at) / STACK_H) * 100}%` }}
                >
                  <span className="absolute inset-y-0 -left-px w-[2px] bg-[linear-gradient(to_bottom,transparent,#fff_30%,#fff_55%,rgba(255,255,255,.12))]" />
                  <span className="grid size-8 place-items-center rounded-tile border border-white/[.1] bg-raised text-text">
                    <Icon k={STEPS[at].icon} className="size-[15px]" />
                  </span>
                  <p className="mt-5 font-mono text-[12.5px] text-dim">
                    {`0${at + 1} · ${STEP_LABELS[at]}`}
                  </p>
                  <h3 className="mt-1.5 text-[22px] text-fg leading-tight tracking-[-0.01em]">
                    {STEPS[at].title}
                  </h3>
                  <p className="mt-3 text-[14.5px] text-body leading-relaxed">
                    {STEPS[at].copy[0]}
                    <br />
                    <span className="text-muted">{STEPS[at].copy[1]}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* below lg: the stack once, then each step with its widget */}
      <div className="mx-auto mt-10 max-w-[640px] px-4 lg:hidden">
        <div className="mx-auto w-full max-w-[340px]">
          <IsoStack data={stack} active={-1} />
        </div>
        <ol className="mt-10 flex flex-col gap-14">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-white/[.08] border-t pt-6">
              <p className="flex items-center gap-3 text-fg">
                <span className="font-mono text-[12.5px] text-dim">{`0${i + 1}`}</span>
                <Icon k={s.icon} />
                <span className="text-[17px]">{s.title}</span>
              </p>
              <p className="mt-3 text-[15px] text-body leading-relaxed">
                {s.copy[0]} <span className="text-muted">{s.copy[1]}</span>
              </p>
              <div className="mt-6 flex justify-center">{widgets[i]}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
