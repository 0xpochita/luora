"use client";

import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { TestList } from "@/components/(main)/trace/TestList";
import { Chip } from "@/components/ui";
import type { Tone } from "@/components/ui/tone";
import type { AtlasData } from "@/features/atlas/types";
import { ICON_PATH, type IconKey } from "@/features/atlas/utils/icons";
import type { Frame, TestResult } from "@/features/trace";
import {
  CoverageWidget,
  FindingsWidget,
  LabWidget,
  TraceWidget,
} from "./FeatureWidgets";
import { type Gsap, Lazy, Reveal, scrollToY, useStage } from "./motion";
import type { LabDemo } from "./stats";
import { Window } from "./Window";
import "./how.css";

/** one labelled pill on a wire: what goes into a step, or what comes out of it */
type Io = { t: string; code?: true; tone?: Tone };
type Step = {
  icon: IconKey;
  title: string;
  copy: [string, string];
  in: Io[];
  out: Io[];
};

/* the pills name only what the copy already says: the commands, the exporter's own output file
   (luora-data.json, see foundry/luora-export.mjs), the analyzers; no counts, nothing invented */
const STEPS: Step[] = [
  {
    icon: "cycle",
    title: "Run your tests",
    copy: [
      "Run forge test -vvvv and forge coverage in your Foundry project.",
      "One script, luora-export.mjs, folds both into a JSON file.",
    ],
    in: [
      { t: "forge test -vvvv", code: true },
      { t: "forge coverage", code: true },
    ],
    out: [{ t: "luora-data.json", code: true }],
  },
  {
    icon: "waves",
    title: "Read every frame",
    copy: [
      "Calls, events and cheatcodes decoded with your own ABIs.",
      "Each frame links to the source lines it executed.",
    ],
    in: [{ t: "luora-data.json", code: true }, { t: "Your ABIs" }],
    out: [{ t: "Decoded frames" }, { t: "Source lines" }],
  },
  {
    icon: "plug",
    title: "Write the test as a graph",
    copy: [
      "Wire actors, calls and expected reverts onto the contract.",
      "Run it in the browser, then export it as a Foundry test.",
    ],
    in: [{ t: "Actors" }, { t: "Calls" }, { t: "Expected reverts" }],
    out: [{ t: "Foundry test", tone: "ok" }],
  },
  {
    icon: "warn",
    title: "Triage what is left",
    copy: [
      "Slither and Aderyn merged into one deduplicated list.",
      "Coverage shows the code no test ever touched.",
    ],
    in: [{ t: "Slither" }, { t: "Aderyn" }, { t: "Coverage" }],
    out: [
      { t: "Findings", tone: "bad" },
      { t: "Untested code", tone: "warn" },
    ],
  },
];

/** the pinned stage only runs where the board fits (same query as `.lp-how-*` in landing.css) */
const HOW_MQ =
  "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
/** timeline units: each step holds STEP, the hand-over wipe is 2·XF wide around each boundary */
const STEP = 2.4;
const XF = 0.5;
const TAIL = 0.9;
const TOTAL = STEP * STEPS.length + TAIL;
/** where step `i` starts on the timeline */
const stepAt = (i: number) => STEP * i;
/** the wipe: from the bottom edge up (clip-path only, composited) */
const SHUT = "inset(100% 0% 0% 0%)";
const OPEN = "inset(0% 0% 0% 0%)";
/** wires draw from the chips towards the core on the left and out of it on the right */
const WIRE_SHUT = "inset(0% 100% 0% 0%)";

/** wire geometry: pills sit on fixed slots, the wires bend into the core's port at the middle */
const WIRE_W = 48;
const WIRE_H = 200;
const SLOT = 56;
const slotY = (j: number, n: number) => WIRE_H / 2 + (j - (n - 1) / 2) * SLOT;

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

function Pill({ io }: { io: Io }) {
  return (
    <Chip
      tone={io.tone ?? "ok"}
      dot={!!io.tone}
      className={`border border-border ${io.code ? "font-mono text-[12px]" : ""}`}
    >
      {io.t}
    </Chip>
  );
}

/**
 * One side of a step's wiring (PlayerZero, pin 5629568280219721): pills on short horizontal
 * runs, each wire bending into the core's port, a dot where it leaves the pill.
 */
function Wires({ items, side }: { items: Io[]; side: "in" | "out" }) {
  const n = items.length;
  const left = side === "in";
  const d = items
    .map((_, j) => {
      const y = slotY(j, n);
      const [a, b] = left ? [y, WIRE_H / 2] : [WIRE_H / 2, y];
      return `M0 ${a}C${WIRE_W / 2} ${a} ${WIRE_W / 2} ${b} ${WIRE_W} ${b}`;
    })
    .join("");
  return (
    <div
      data-lp={side}
      className={`lp-how-io absolute inset-0 flex ${left ? "" : "flex-row-reverse"}`}
    >
      <div className="relative flex-1">
        {items.map((io, j) => (
          <span
            key={io.t}
            className={`absolute -translate-y-1/2 ${left ? "right-0" : "left-0"}`}
            style={{ top: slotY(j, n) }}
          >
            <Pill io={io} />
          </span>
        ))}
      </div>
      <svg
        aria-hidden="true"
        data-lp="wire"
        width={WIRE_W}
        height={WIRE_H}
        viewBox={`0 0 ${WIRE_W} ${WIRE_H}`}
        className="flex-none overflow-visible"
        fill="none"
      >
        <path d={d} stroke="var(--wire)" strokeWidth="1" />
        {items.map((io, j) => (
          <circle
            key={io.t}
            cx={left ? 0 : WIRE_W}
            cy={slotY(j, n)}
            r="2.5"
            fill="var(--wire-on)"
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * 'How Luora works' — eighth pass. Pins studied 2026-10-09 from the Pinterest search
 * 'winning awward website' (id.pinterest.com, the user's pick), chosen for fit, not flash:
 *  H1 pin/5629568280219721 (PlayerZero, debugging dev tool) — one core tile in the middle, thin
 *     wires bending out of it to labelled pills (Customer / Bug / Issues → Code / Ticket / PR)
 *     → the board: each step's inputs wire into the core from the left, its outputs leave right.
 *  H2 pin/436497388907405556 (ONYX 'Our Process From Idea to Impact', data product) — huge thin
 *     '01', the next number already rising into its masked cell, panels sliding up over the last
 *     → the rolling index digit, and every hand-over wipes the next step up over the old one.
 *  H3 pin/3307399722549125 (Lumina, SDK / MCP platform) — one lit hairline carrying from one
 *     block into the next → the bright edge riding the wipe across the core.
 *  H4 pin/5207355814660740 (GRFN / roasti 'How it works') — circled 1 → 2 → 3 joined by strokes
 *     → the step rail; the stroke after a step fills while that step is open.
 * Scroll-driven: the stage pins, one scrubbed timeline (clip-path / transform / opacity only)
 * plays forwards and back. Phones, tablets, reduced motion: the static list, one widget per step.
 * Every widget mounts only near the screen (Lazy), so the layout that is display:none never builds.
 */
export function HowItWorks({
  tests,
  frames,
  test,
  lab,
  atlas,
}: {
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
    const stage = q("[data-lp=stage]")[0];
    const notes = q("[data-lp=note]");
    const widgets = q("[data-lp=widget]");
    const edges = q("[data-lp=edge]");
    const bodies = q("[data-lp=body]");
    const ins = q("[data-lp=in]");
    const outs = q("[data-lp=out]");
    const links = q("[data-lp=link]");
    /** a step's two wire drawings (left into the core, right out of it) */
    const wire = (i: number) => [
      ins[i].querySelector("svg"),
      outs[i].querySelector("svg"),
    ];
    /** the lit edge (H3) rides the wipe from the core's bottom to its top, bright only mid-way */
    const edge = (t: GSAPTimeline, i: number, h: number, d: number) =>
      t
        .fromTo(edges[i], { yPercent: 100 }, { yPercent: 0, duration: d }, h)
        .fromTo(
          edges[i],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: d * 0.2, ease: "none" },
          h,
        )
        .to(
          edges[i],
          { autoAlpha: 0, duration: d * 0.3, ease: "none" },
          h + d * 0.7,
        );

    // 1. on the way in (before the pin): the board rises, the first step wipes up into the core
    const enter = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: {
        trigger: stage,
        start: "top 85%",
        end: "top top",
        scrub: 0.6,
      },
    });
    enter
      .fromTo(
        q("[data-lp=board]"),
        { y: 140, scale: 0.94, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 1 },
        0,
      )
      .fromTo(
        widgets[0],
        { clipPath: SHUT, autoAlpha: 1 },
        { clipPath: OPEN, autoAlpha: 1, duration: 0.7, ease: "power2.inOut" },
        0.3,
      )
      .fromTo(
        notes[0],
        { clipPath: SHUT, y: 32, autoAlpha: 1 },
        { clipPath: OPEN, autoAlpha: 1, y: 0, duration: 0.6 },
        0.4,
      )
      .fromTo(
        wire(0),
        { clipPath: WIRE_SHUT },
        { clipPath: OPEN, duration: 0.5 },
        0.5,
      )
      .fromTo(
        [ins[0], outs[0]],
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.4 },
        0.5,
      );
    edge(enter, 0, 0.3, 0.7);

    // 2. pinned: every hand-over wipes the next step up over the last, a lit edge on the wipe
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "+=380%",
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
    STEPS.forEach((_, i) => {
      // the stroke after this step's circle fills while the step is open (H4)
      if (links[i])
        tl.fromTo(
          links[i],
          { scaleX: 0 },
          { scaleX: 1, duration: STEP, ease: "none" },
          stepAt(i),
        );
      if (!i) return;
      const h = stepAt(i) - XF;
      const d = XF * 2;
      tl.to(bodies[i - 1], { scale: 0.92, y: -40, duration: d }, h)
        .to(widgets[i - 1], { autoAlpha: 0, duration: d * 0.4 }, h + d * 0.6)
        .fromTo(
          widgets[i],
          { clipPath: SHUT, autoAlpha: 1 },
          { clipPath: OPEN, autoAlpha: 1, duration: d },
          h,
        )
        .to(notes[i - 1], { y: -28, autoAlpha: 0, duration: d * 0.6 }, h)
        .fromTo(
          notes[i],
          { clipPath: SHUT, y: 32, autoAlpha: 1 },
          { clipPath: OPEN, autoAlpha: 1, y: 0, duration: d * 0.7 },
          h + d * 0.3,
        )
        // the old wiring lets go, the new one draws in from the pills to the core and out
        .to(ins[i - 1], { autoAlpha: 0, x: -24, duration: d * 0.5 }, h)
        .to(outs[i - 1], { autoAlpha: 0, x: 24, duration: d * 0.5 }, h)
        .fromTo(
          [ins[i], outs[i]],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: d * 0.4 },
          h + d * 0.4,
        )
        .fromTo(
          wire(i),
          { clipPath: WIRE_SHUT },
          { clipPath: OPEN, duration: d * 0.6 },
          h + d * 0.4,
        )
        // the index digit rolls up one, the number rising inside its cell (H2)
        .to(
          q("[data-lp=digits]"),
          { yPercent: (-100 * i) / STEPS.length, duration: d },
          h,
        );
      edge(tl, i, h, d);
    });
    // 3. after the last step the scene sinks back while the next scene comes up
    tl.to(
      q("[data-lp=scene]"),
      {
        scale: 0.95,
        y: -30,
        autoAlpha: 0.35,
        duration: TAIL,
        ease: "power1.in",
      },
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
        <div
          data-lp="scene"
          className="mx-auto grid h-full max-w-[1320px] grid-cols-[minmax(0,300px)_minmax(0,1fr)] items-center gap-12 px-8"
        >
          {/* left: heading, the rolling index (H2), the open step's note, the step rail (H4) */}
          <div className="flex h-full flex-col justify-center py-[8vh]">
            {head}
            <div className="mt-[5vh] flex items-end gap-3">
              <span className="flex font-light text-[clamp(104px,8.5vw,150px)] leading-none tracking-[-0.06em]">
                <span className="lp-how-num">0</span>
                <span className="relative block h-[1em] overflow-hidden">
                  <span data-lp="digits" className="block">
                    {STEPS.map((s, i) => (
                      <span key={s.title} className="lp-how-num block h-[1em]">
                        {i + 1}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
              <span className="mb-3 font-mono text-[12.5px] text-dim">
                / 0{STEPS.length}
              </span>
            </div>
            <div className="relative mt-5 h-[140px]">
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
            <ol className="mt-6 flex items-center">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === at ? "step" : undefined}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    className={`grid size-8 flex-none place-items-center rounded-full border font-mono text-[12px] transition-colors ${
                      i === at
                        ? "border-transparent bg-primary text-primary-fg"
                        : i < at
                          ? "border-white/40 text-fg"
                          : "border-white/[.14] text-dim hover:text-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className="relative mx-2 block h-px flex-1 bg-white/[.1]">
                      <span
                        data-lp="link"
                        className="absolute inset-0 origin-left scale-x-0 bg-white/70"
                      />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* right: the board (H1): inputs wire into the core, the core shows the step's real UI */}
          <div
            data-lp="board"
            className="grid h-[78vh] max-h-[700px] grid-cols-[176px_minmax(0,1fr)_176px] items-center"
          >
            <div className="relative" style={{ height: WIRE_H }}>
              {STEPS.map((s) => (
                <Wires key={s.title} items={s.in} side="in" />
              ))}
            </div>
            <div className="relative h-full rounded-[30px] border border-white/[.07] bg-white/[.025] p-2.5 shadow-[0_40px_90px_-30px_rgba(0,0,0,.9)]">
              {/* the core's two ports, where the wires land */}
              <span className="absolute top-1/2 -left-[3px] size-1.5 -translate-y-1/2 rounded-full bg-wire-on" />
              <span className="absolute top-1/2 -right-[3px] size-1.5 -translate-y-1/2 rounded-full bg-wire-on" />
              <div className="dot-grid relative size-full overflow-hidden rounded-[22px] border border-white/[.05]">
                {widgets.map((w, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: one widget per fixed step
                    key={i}
                    data-lp="widget"
                    inert={i !== at}
                    className="lp-how-widget dot-grid absolute inset-0"
                  >
                    {/* the slot is filled like the core, so the wipe covers the step below it */}
                    <div
                      data-lp="body"
                      className="flex size-full items-center justify-center p-6"
                    >
                      <Lazy className="size-full">{w}</Lazy>
                    </div>
                  </div>
                ))}
                {STEPS.map((s) => (
                  <div
                    key={s.title}
                    data-lp="edge"
                    aria-hidden="true"
                    className="lp-how-edge pointer-events-none absolute inset-0"
                  />
                ))}
              </div>
            </div>
            <div className="relative" style={{ height: WIRE_H }}>
              {STEPS.map((s) => (
                <Wires key={s.title} items={s.out} side="out" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* phones, tablets, reduced motion: each step with its wiring and widget, no pin */}
      <div className="lp-how-static mx-auto max-w-[640px] px-4 pb-32">
        {head}
        <ol className="mt-12 flex flex-col gap-16">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal>
                <p className="flex items-baseline gap-3 text-fg">
                  <span className="font-light text-[40px] text-white/30 leading-none tracking-[-0.04em]">{`0${i + 1}`}</span>
                  <span className="text-[19px]">{s.title}</span>
                </p>
                <p className="mt-3 text-[15px] text-body leading-relaxed">
                  {s.copy[0]} <span className="text-muted">{s.copy[1]}</span>
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-1.5">
                  {s.in.map((io) => (
                    <Pill key={io.t} io={io} />
                  ))}
                  <span aria-hidden="true" className="px-1 text-dim">
                    →
                  </span>
                  {s.out.map((io) => (
                    <Pill key={io.t} io={io} />
                  ))}
                </p>
                <div className="mt-6 flex justify-center">
                  <Lazy className="h-[320px] w-full">{widgets[i]}</Lazy>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
