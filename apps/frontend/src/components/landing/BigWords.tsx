"use client";

import gsap from "gsap";
import { useRef } from "react";
import { ICON_PATH, type IconKey } from "@/features/atlas/utils/icons";
import { MOTION_MQ, useStage } from "./motion";

type Word = {
  word: string;
  line: string;
  /** two small monochrome glyphs beside the word: icon, side, height in the screen, finding dot */
  glyphs: { icon: IconKey; x: string; y: string; bad?: boolean }[];
};

const WORDS: Word[] = [
  {
    word: "Trace",
    line: "Every call, event and cheatcode decoded with your own ABIs.",
    glyphs: [
      { icon: "waves", x: "18%", y: "22%" },
      { icon: "fn", x: "78%", y: "70%" },
    ],
  },
  {
    word: "Test",
    line: "Wire actors and calls, export the scenario as a .t.sol.",
    glyphs: [
      { icon: "plug", x: "80%", y: "22%" },
      { icon: "user", x: "20%", y: "72%" },
    ],
  },
  {
    word: "Triage",
    line: "Slither and Aderyn merged into one finding per issue.",
    glyphs: [
      { icon: "warn", x: "16%", y: "72%", bad: true },
      { icon: "check", x: "82%", y: "22%" },
    ],
  },
];

/** a letter's tumble while it drops in (the last letters trail, like Genie's 'Creat e') */
const TILT = [-14, 9, -6, 12, -10, 16];

/**
 * Genie: three giant words ('Create' / 'Like' / 'Magic'), one per screen, each letter dropping in
 * on its own with the scroll, small mascots floating beside them. Here 'Trace' / 'Test' / 'Triage',
 * the three things Luora does, with monochrome icon badges for mascots (the only red is on the
 * finding glyph). Not pinned: it hands straight over to 'How Luora works'.
 */
function bigWords(root: HTMLElement) {
  for (const block of gsap.utils.toArray<HTMLElement>("[data-lp=word]", root)) {
    const q = gsap.utils.selector(block);
    const letters = q("[data-lp=letter]");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: block,
          start: "top 85%",
          end: "center 55%",
          scrub: 0.6,
        },
      })
      .fromTo(
        letters,
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
    // the glyphs float past at their own pace (parallax), turning a little
    gsap.fromTo(
      q("[data-lp=glyph]"),
      { y: 140, rotate: -12 },
      {
        y: -140,
        rotate: 12,
        ease: "none",
        scrollTrigger: {
          trigger: block,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  }
}

export function BigWords() {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, bigWords, MOTION_MQ);
  return (
    <section ref={ref} data-tone="words" aria-label="Trace, test, triage">
      {WORDS.map((w) => (
        <div
          key={w.word}
          data-lp="word"
          className="relative flex min-h-[70svh] flex-col items-center justify-center px-4 md:min-h-[100svh]"
        >
          {w.glyphs.map((g) => (
            <span
              key={g.icon}
              data-lp="glyph"
              aria-hidden="true"
              className="absolute grid size-12 place-items-center rounded-full border border-white/[.1] bg-card-grad text-muted shadow-soft md:size-16"
              style={{ left: g.x, top: g.y }}
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
                <path d={ICON_PATH[g.icon]} />
              </svg>
              {g.bad && (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-red" />
              )}
            </span>
          ))}
          <h2
            aria-label={w.word}
            className="font-light text-[clamp(96px,22vw,320px)] text-fg leading-[0.9] tracking-[-0.06em]"
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
            className="mt-6 max-w-[420px] text-center text-[16px] text-muted leading-relaxed md:text-[18px]"
          >
            {w.line}
          </p>
        </div>
      ))}
    </section>
  );
}
