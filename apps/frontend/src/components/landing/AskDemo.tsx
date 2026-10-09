"use client";

import dynamic from "next/dynamic";
import type { AiQuestion } from "@/features/atlas/types";
import { loadAtlas, useAtlas } from "./atlas";
import { Lazy } from "./motion";

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
 * the card row's band and the prompt box with its three questions, the carousel filling it in
 * once it nears the screen.
 */
export function AskDemo() {
  return (
    <Lazy
      wait={ready}
      fallback={
        <div className="relative pb-16">
          <div className="h-[300px]" />
          <div className="relative mx-auto mt-6 max-w-[780px] rounded-card border border-border bg-card-grad p-2 shadow-float">
            <div className="px-3 pt-3 pb-2 md:px-4 md:pt-4">
              <p className="min-h-[3.75em] text-[clamp(21px,2.4vw,28px)] leading-[1.25] md:min-h-[2.5em]" />
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3">
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
            <div className="mt-2 h-[300px] rounded-inner border border-border bg-inner-grad" />
          </div>
        </div>
      }
    >
      <Live />
    </Lazy>
  );
}
