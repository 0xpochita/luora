"use client";

import { type ReactNode, useRef } from "react";
import type { AtlasData } from "@/features/atlas/types";
import { ICON_PATH, type IconKey } from "@/features/atlas/utils/icons";
import type { Frame } from "@/features/trace";
import { type Gsap, Lazy, MOTION_MQ, useStage } from "./motion";
import type { LabDemo } from "./stats";
import { TestVisual, TraceVisual, TriageVisual } from "./WordVisuals";

type Layout = "left" | "right" | "top";

type Word = {
  word: string;
  line: string;
  /** word + copy left of the visual, right of it, or above it (the word slides up as it rises) */
  layout: Layout;
  /** two icon badges orbiting the visual: icon, where they sit on its edge, finding dot */
  glyphs: { icon: IconKey; at: string; bad?: boolean }[];
  /** the empty spot's height until the visual mounts (Lazy) */
  min: string;
  visual: ReactNode;
};

/** a letter's tumble while it drops in (the last letters trail, like Genie's 'Creat e') */
const TILT = [-14, 9, -6, 12, -10, 16];

/**
 * Genie: three giant words ('Create' / 'Like' / 'Magic'), each letter dropping in on its own with
 * the scroll, mascots beside them. Here 'Trace' / 'Test' / 'Triage', the three things Luora does,
 * each sharing its screen with the product doing it (WordVisuals): the word and its line on one
 * side, the live UI on the other (or under it, the word sliding up as it rises), the UI scrubbing
 * in (rise, 0.96 → 1, tilted back → flat) with the icon badges orbiting its corners. Phones stack
 * word, line, visual; reduced motion shows everything in place.
 */
function bigWords(root: HTMLElement, gsap: Gsap) {
  for (const block of gsap.utils.toArray<HTMLElement>("[data-lp=word]", root)) {
    const q = gsap.utils.selector(block);
    const [visual] = q("[data-lp=visual]");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: block,
          start: "top 85%",
          end: "top 25%",
          scrub: 0.6,
        },
      })
      .fromTo(
        q("[data-lp=letter]"),
        {
          yPercent: -140,
          rotate: (i) => TILT[i % TILT.length],
          autoAlpha: 0,
        },
        {
          yPercent: 0,
          rotate: 0,
          autoAlpha: 1,
          ease: "bounce.out",
          stagger: 0.12,
          duration: 1,
        },
      )
      .fromTo(
        q("[data-lp=line]"),
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.6 },
        "-=0.4",
      );
    const rise = {
      trigger: visual,
      start: "top 100%",
      end: "top 40%",
      scrub: 0.6,
    };
    gsap.fromTo(
      visual,
      {
        y: 140,
        scale: 0.96,
        rotateX: 12,
        autoAlpha: 0,
        transformPerspective: 1400,
        transformOrigin: "50% 0%",
      },
      {
        y: 0,
        scale: 1,
        rotateX: 0,
        autoAlpha: 1,
        ease: "power2.out",
        scrollTrigger: rise,
      },
    );
    // the word above its visual slides up out of the way as the visual rises
    if (block.dataset.layout === "top")
      gsap.fromTo(
        q("[data-lp=head]"),
        { y: 60 },
        { y: -40, ease: "none", scrollTrigger: rise },
      );
    // the badges circle their corner of the visual while it passes
    // (a tighter circle on phones, where the badges sit in the gap above and below the visual)
    const orbit = matchMedia("(min-width: 768px)").matches ? 26 : 8;
    for (const [i, g] of q("[data-lp=glyph]").entries()) {
      const r = i ? -orbit : orbit;
      gsap.to(g, {
        keyframes: { x: [0, r, 0, -r, 0], y: [-r, 0, r, 0, -r] },
        easeEach: "sine.inOut",
        rotate: i ? -40 : 40,
        ease: "none",
        scrollTrigger: {
          trigger: block,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }
  }
}

function Glyph({ icon, at, bad }: Word["glyphs"][number]) {
  return (
    <span
      data-lp="glyph"
      aria-hidden="true"
      className={`absolute z-10 grid size-11 place-items-center rounded-full border border-white/[.1] bg-card-grad text-muted shadow-soft md:size-14 ${at}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5 md:size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICON_PATH[icon]} />
      </svg>
      {bad && (
        <span className="absolute top-1 right-1 size-2 rounded-full bg-red" />
      )}
    </span>
  );
}

const GRID: Record<Layout, string> = {
  left: "md:grid-cols-[4fr_7fr]",
  right: "md:grid-cols-[7fr_4fr]",
  top: "",
};

export function BigWords({
  trace,
  scenario,
  sol,
  atlas,
}: {
  trace: { test: string; frames: Frame[] };
  scenario: LabDemo | null;
  sol: { file: string; lines: string[] } | null;
  atlas: AtlasData;
}) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, bigWords, MOTION_MQ);
  const words: Word[] = [
    {
      word: "Trace",
      line: "Every call, event and cheatcode decoded with your own ABIs.",
      layout: "left",
      glyphs: [
        { icon: "waves", at: "-top-12 left-3 md:-top-16 md:-left-4" },
        { icon: "fn", at: "-bottom-12 right-3 md:-right-4 md:-bottom-16" },
      ],
      min: "min-h-[640px]",
      visual: <TraceVisual {...trace} />,
    },
    {
      word: "Test",
      line: "Wire actors and calls, export the scenario as a .t.sol.",
      layout: "right",
      glyphs: [
        { icon: "plug", at: "-top-12 right-3 md:-top-16 md:-right-4" },
        { icon: "user", at: "-bottom-12 left-3 md:-bottom-16 md:-left-4" },
      ],
      min: "min-h-[720px]",
      visual: scenario && <TestVisual scenario={scenario} sol={sol} />,
    },
    {
      word: "Triage",
      line: "Slither and Aderyn merged into one finding per issue.",
      layout: "top",
      glyphs: [
        { icon: "warn", at: "-top-12 left-3 md:-top-16 md:-left-4", bad: true },
        { icon: "check", at: "-bottom-12 right-3 md:-right-4 md:-bottom-16" },
      ],
      min: "min-h-[760px]",
      visual: <TriageVisual atlas={atlas} />,
    },
  ];
  return (
    <section ref={ref} data-tone="words" aria-label="Trace, test, triage">
      {words.map((w) => (
        <div
          key={w.word}
          data-lp="word"
          data-layout={w.layout}
          className={`mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-24 md:min-h-[100svh] md:gap-16 md:px-6 md:py-32 ${GRID[w.layout]}`}
        >
          <div
            data-lp="head"
            className={
              w.layout === "top"
                ? "text-center"
                : w.layout === "right"
                  ? "md:order-last md:text-right"
                  : ""
            }
          >
            <h2
              aria-label={w.word}
              className={`font-light text-fg leading-[0.9] tracking-[-0.06em] ${
                w.layout === "top"
                  ? "text-[clamp(96px,17vw,240px)]"
                  : "text-[clamp(96px,11vw,168px)]"
              }`}
            >
              {[...w.word].map((c, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat, their position is the identity
                  key={i}
                  data-lp="letter"
                  aria-hidden="true"
                  className="inline-block"
                >
                  {c}
                </span>
              ))}
            </h2>
            <p
              data-lp="line"
              className={`mt-6 max-w-[420px] text-balance text-[16px] text-muted leading-relaxed md:text-[18px] ${
                w.layout === "top"
                  ? "mx-auto"
                  : w.layout === "right"
                    ? "md:ml-auto"
                    : ""
              }`}
            >
              {w.line}
            </p>
          </div>
          <div data-lp="visual" className="relative min-w-0">
            {w.glyphs.map((g) => (
              <Glyph key={g.icon} {...g} />
            ))}
            <Lazy className={w.min}>{w.visual}</Lazy>
          </div>
        </div>
      ))}
    </section>
  );
}
