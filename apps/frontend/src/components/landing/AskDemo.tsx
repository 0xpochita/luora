"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useRef } from "react";
import type { AiQuestion } from "@/features/atlas/types";
import { loadAtlas, useAtlas } from "./atlas";
import { type Gsap, Lazy, MOTION_MQ, useStage } from "./motion";

export const QUESTIONS: { q: AiQuestion; label: string }[] = [
  { q: "explain", label: "Explain" },
  { q: "risks", label: "What to check" },
  { q: "test", label: "Write a test" },
];

// the carousel (AskCarousel.tsx) and the atlas it reads are fetched as the section nears
const carousel = () => import("./AskCarousel");
const ready = () => Promise.all([carousel(), loadAtlas()]);
const Carousel = dynamic(() => carousel().then((m) => m.AskCarousel));
function Live() {
  const atlas = useAtlas();
  return atlas && <Carousel atlas={atlas} />;
}

/**
 * Ask's carousel + prompt box (AskCarousel.tsx). It draws from the sample atlas, which is not
 * inlined in the page (atlas.ts), so the server HTML carries this empty frame of the same size:
 * the card row's band and the idle prompt box (placeholder + its three questions), the carousel
 * filling it in once it nears the screen.
 */
export function AskDemo() {
  return (
    <Lazy
      wait={ready}
      fallback={
        <div className="relative pb-16">
          <div className="h-[300px]" />
          <div className="relative mx-auto mt-6 max-w-[920px] rounded-[28px] border border-border bg-card-grad p-2 shadow-float">
            <div className="px-3 pt-4 pb-2 md:px-5">
              <p className="min-h-[clamp(52px,8svh,96px)] text-[clamp(17px,min(2.4vw,2.9svh),28px)] text-white/30 leading-[1.25]">
                Ask about a line…
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-3">
                <span className="text-[13px]">&nbsp;</span>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {QUESTIONS.map((x) =>
                    x.q === "risks" ? (
                      <span
                        key={x.q}
                        className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] text-primary-fg"
                      >
                        <span aria-hidden="true">✦</span>
                        {x.label}
                      </span>
                    ) : (
                      <span
                        key={x.q}
                        className="flex h-9 items-center rounded-full bg-raised px-3.5 text-[13px] text-muted"
                      >
                        {x.label}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <Live />
    </Lazy>
  );
}

/**
 * The user: the Ask block must not slip by in a scroll. The section pins for a screen and a bit:
 * the box idles on its placeholder, then "What to check" presses itself and the answer opens;
 * any scroll back up resets the box. The pin is the section's own (here, from the first paint),
 * the carousel mounts later and follows it: `data-ask-open` and an `lp-ask` event on the section
 * (AskCarousel.tsx).
 */
function askPin(root: HTMLElement, gsap: Gsap) {
  let open = false;
  const set = (on: boolean) => {
    if (on === open) return;
    open = on;
    root.toggleAttribute("data-ask-open", on);
    root.dispatchEvent(new CustomEvent("lp-ask", { detail: on }));
  };
  gsap
    .timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=120%",
        pin: true,
        onUpdate: (self) => {
          if (self.direction < 0) set(false);
          else if (self.progress > 0.18) set(true);
        },
        onLeaveBack: () => set(false),
      },
    })
    .to({}, { duration: 1 });
  return () => set(false);
}

export function AskStage({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, askPin, MOTION_MQ);
  return (
    <section ref={ref} id="ask" data-tone="ask" className={className}>
      {children}
    </section>
  );
}
