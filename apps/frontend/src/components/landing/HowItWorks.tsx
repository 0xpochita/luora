"use client";

import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useCallback, useRef, useState } from "react";
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
import { IsoStack, STACK_H, STACK_W, type StackData } from "./IsoStack";
import { type Gsap, Lazy, scrollToY, useStage } from "./motion";
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

/** the pinned stage only runs where its three columns fit (same query as `.lp-how-*` in landing.css) */
const HOW_MQ =
  "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
/** timeline units: the plates assemble, then each step holds STEP, then the plates close up again */
const ASSEMBLE = 1.2;
const STEP = 2.4;
const XF = 0.45; // half the crossfade between two steps
const TOTAL = ASSEMBLE + STEP * STEPS.length + 0.8;
/** where step `i` starts on the timeline */
const stepAt = (i: number) => ASSEMBLE + STEP * i;

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
 * 'How Luora works' — seventh pass, restaged like Genie's pinned scenes.
 *
 * Genie (geniestudio.app, studied 2026-10-09): the section pins for several viewports and the
 * scroll scrubs one timeline — things assemble as you arrive, swap in place while pinned, and
 * close up before the next scene takes over (its 'Create visuals' prompt scene and the style
 * wheel). Here: the four R22 plates fly together from a collapsed slab, each step lifts its plate,
 * crossfades its note and its product widget (rise + blur, scrubbed, so it plays back on the way
 * up), and the slab closes again at the end.
 * R25 (pin 700661654577045083) + P2 (pin 523191681737169397, Lore "01 Write / 02 Generate"): one
 * huge index that rolls like an odometer, the number dim and the step name bright beside it.
 * R22's boxed hairline frame and grid are gone: three columns on open space, one thin progress
 * track per step instead of cell borders.
 * Phones, tablets and reduced motion: the static list (stack once, then each step + widget).
 * Both layouts are in the HTML, but their widgets (and the static stack) mount only near the
 * screen (Lazy), so the layout that is display:none never builds them.
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
  const ref = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [at, setAt] = useState(0);

  const setup = useCallback((root: HTMLElement, gsap: Gsap) => {
    const q = gsap.utils.selector(root);
    const plates = q("[data-lp=plate]");
    const notes = q("[data-lp=note]");
    const widgets = q("[data-lp=widget]");
    const bars = q("[data-lp=bar]");
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: q("[data-lp=stage]")[0],
        start: "top top",
        end: "+=420%",
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const t = self.progress * TOTAL;
          let i = 0;
          while (i < STEPS.length - 1 && t >= stepAt(i + 1)) i++;
          setAt(i);
        },
      },
    });
    trigger.current = tl.scrollTrigger ?? null;
    // 1. the plates fly apart out of one collapsed slab; the first note and widget rise in
    tl.fromTo(
      plates,
      { y: (i) => (1.5 - i) * 150, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: ASSEMBLE, stagger: 0.08 },
      0,
    )
      .fromTo(
        q("[data-lp=guides]"),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: ASSEMBLE * 0.6 },
        ASSEMBLE * 0.5,
      )
      .fromTo(
        [notes[0], widgets[0]],
        { autoAlpha: 0, y: 40, filter: "blur(8px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: ASSEMBLE * 0.8 },
        ASSEMBLE * 0.3,
      );
    // 2. each step: the progress track fills; at the hand-over the note and widget swap in place
    STEPS.forEach((_, i) => {
      tl.fromTo(
        bars[i],
        { scaleX: 0 },
        { scaleX: 1, duration: STEP, ease: "none" },
        stepAt(i),
      );
      if (!i) return;
      const h = stepAt(i) - XF;
      tl.to(
        [notes[i - 1], widgets[i - 1]],
        { autoAlpha: 0, y: -40, filter: "blur(8px)", duration: XF * 2 },
        h,
      )
        .fromTo(
          [notes[i], widgets[i]],
          { autoAlpha: 0, y: 48, filter: "blur(8px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: XF * 2 },
          h,
        )
        // the big index rolls one number up, like an odometer
        .to(
          q("[data-lp=digits]"),
          { yPercent: (-100 * i) / STEPS.length, duration: XF * 2 },
          h,
        );
    });
    // 3. the slab closes up again as the next scene comes in
    tl.to(
      plates,
      { y: (i) => (1.5 - i) * 60, duration: 0.8, ease: "power2.in" },
      stepAt(STEPS.length),
    );
  }, []);
  useStage(ref, setup, HOW_MQ);

  const go = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    scrollToY(
      st.start + ((stepAt(i) + STEP * 0.5) / TOTAL) * (st.end - st.start),
    );
  };

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

  const head = (
    <>
      <p className="flex items-center gap-2 text-[13px] text-text">
        <span className="size-1.5 rounded-full bg-white" />
        How Luora works
      </p>
      <h2 className="mt-4 font-medium text-[clamp(30px,3.2vw,44px)] text-fg leading-[1.06] tracking-[-0.025em]">
        Four layers,
        <br />
        <span className="text-white/45">one local run.</span>
      </h2>
    </>
  );

  return (
    <section ref={ref} id="how-it-works" data-tone="how">
      {/* lg+ with motion: one pinned screen, the timeline above drives everything in it */}
      <div data-lp="stage" className="lp-how-stage">
        <div className="mx-auto grid h-full max-w-[1320px] grid-cols-[minmax(0,330px)_auto_minmax(0,1fr)] items-center gap-10 px-8">
          {/* left: heading, rolling index, the open step's note, the step tracks */}
          <div className="flex h-full flex-col justify-center py-[9vh]">
            {head}
            <div className="mt-[6vh] flex items-end gap-3">
              <span className="relative block h-[1em] overflow-hidden font-light text-[clamp(112px,9vw,160px)] leading-none tracking-[-0.06em]">
                <span data-lp="digits" className="block">
                  {STEPS.map((s, i) => (
                    <span
                      key={s.title}
                      className="block h-[1em] bg-[linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.06)_92%)] bg-clip-text text-transparent"
                    >
                      {`0${i + 1}`}
                    </span>
                  ))}
                </span>
              </span>
              <span className="mb-3 font-mono text-[12.5px] text-dim">
                / 0{STEPS.length}
              </span>
            </div>
            <div className="relative mt-6 h-[150px]">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  data-lp="note"
                  aria-hidden={i !== at}
                  className="lp-how-note absolute inset-x-0 top-0"
                >
                  <h3 className="flex items-center gap-2.5 text-[22px] text-fg leading-tight tracking-[-0.01em]">
                    <Icon k={s.icon} className="size-[18px] text-muted" />
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[15px] text-body leading-relaxed">
                    {s.copy[0]} <span className="text-muted">{s.copy[1]}</span>
                  </p>
                </div>
              ))}
            </div>
            <ol className="mt-4 grid grid-cols-4 gap-3">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === at ? "step" : undefined}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    className={`group block w-full pt-3 text-left transition-colors ${i === at ? "text-fg" : "text-dim hover:text-muted"}`}
                  >
                    <span className="relative block h-px w-full bg-white/[.1]">
                      <span
                        data-lp="bar"
                        className="absolute inset-0 origin-left scale-x-0 bg-white/80"
                      />
                    </span>
                    <span className="mt-2.5 block font-mono text-[12.5px]">{`0${i + 1}`}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* centre: the plates (R22 / R23 / R24) */}
          <div
            className="relative h-[84vh]"
            style={{ aspectRatio: `${STACK_W} / ${STACK_H}` }}
          >
            <IsoStack data={stack} active={at} />
          </div>

          {/* right: the open step's product widget, swapped in place */}
          <div className="relative h-[84vh]">
            {widgets.map((w, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: one widget per fixed step
                key={i}
                data-lp="widget"
                inert={i !== at}
                className="lp-how-widget absolute inset-0 flex items-center justify-center"
              >
                <Lazy className="size-full">{w}</Lazy>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* phones, tablets, reduced motion: the stack once, then each step with its widget */}
      <div className="lp-how-static mx-auto max-w-[640px] px-4 pb-32">
        {head}
        <div className="mx-auto mt-10 w-full max-w-[340px]">
          <Lazy className="aspect-[500/830] w-full">
            <IsoStack data={stack} active={-1} />
          </Lazy>
        </div>
        <ol className="mt-10 flex flex-col gap-14">
          {STEPS.map((s, i) => (
            <li key={s.title} className="pt-2">
              <p className="flex items-baseline gap-3 text-fg">
                <span className="font-light text-[40px] text-white/30 leading-none tracking-[-0.04em]">{`0${i + 1}`}</span>
                <span className="text-[19px]">{s.title}</span>
              </p>
              <p className="mt-3 text-[15px] text-body leading-relaxed">
                {s.copy[0]} <span className="text-muted">{s.copy[1]}</span>
              </p>
              <div className="mt-6 flex justify-center">
                <Lazy className="h-[320px] w-full">{widgets[i]}</Lazy>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
