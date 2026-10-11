"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui";
import type { Risk } from "@/features/atlas/types";
import { type Gsap, useStage } from "./motion";

export type WheelFinding = {
  id: string;
  title: string;
  risk: Risk;
  severity: string;
  tools: string;
  where: string;
  what: string;
};

/** degrees between two cards on the wheel */
const STEP = 17;

/**
 * Genie: a pinned arc of style cards that turns like a wheel as you scroll, 'Hover to reveal more
 * information' under it. Here the cards are the sample vault's real findings (severity chip, the
 * analyzers that reported it, detector and lines) and hovering one reads it out under the arc.
 */
function findingsWheel(root: HTMLElement, gsap: Gsap) {
  const q = gsap.utils.selector(root);
  const wheel = q("[data-lp=wheel]")[0];
  const n = wheel.children.length;
  let top = -1;
  gsap
    .timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=180%",
        pin: true,
        scrub: 0.8,
      },
      // the card passing the top of the arc is read out until a hover picks another
      onUpdate: () => {
        const rot = Number(gsap.getProperty(wheel, "rotate"));
        const i = Math.min(
          n - 1,
          Math.max(0, Math.round((n - 1) / 2 - rot / STEP)),
        );
        if (i === top) return;
        top = i;
        root.dispatchEvent(new CustomEvent("lp-top", { detail: i }));
      },
    })
    .fromTo(
      q("[data-lp=wheel]"),
      { rotate: 44 },
      { rotate: -44, ease: "none", duration: 1 },
    )
    .fromTo(
      q("[data-lp=wheel-head]"),
      { y: 40, autoAlpha: 0.2 },
      { y: 0, autoAlpha: 1, duration: 0.2, ease: "power2.out" },
      0,
    );
}

export function FindingsWheel({ findings }: { findings: WheelFinding[] }) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, findingsWheel);
  const [on, setOn] = useState(0);
  useEffect(() => {
    const el = ref.current;
    const follow = (e: Event) => setOn((e as CustomEvent<number>).detail);
    el?.addEventListener("lp-top", follow);
    return () => el?.removeEventListener("lp-top", follow);
  }, []);
  const f = findings[on];
  const mid = (findings.length - 1) / 2;
  return (
    <section ref={ref} id="findings" data-tone="findings" className="lp-wheel">
      <div data-lp="wheel-head" className="lp-wheel-head px-4 text-center">
        <p className="flex items-center justify-center gap-2 text-[13px] text-text">
          <span className="size-1.5 rounded-full bg-red" />
          {findings.length} findings in the sample vault
        </p>
        <h2 className="mt-4 font-medium text-[clamp(30px,4vw,50px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Every analyzer,
          <br />
          <span className="text-white/45">one finding per issue.</span>
        </h2>
      </div>
      <ul data-lp="wheel" className="lp-wheel-ring">
        {findings.map((x, i) => (
          <li
            key={x.id}
            className="lp-wheel-card"
            style={{ "--a": `${(i - mid) * STEP}deg` } as React.CSSProperties}
          >
            <button
              type="button"
              onMouseEnter={() => setOn(i)}
              onFocus={() => setOn(i)}
              onClick={() => setOn(i)}
              aria-pressed={i === on}
              className={`flex h-full w-full flex-col gap-2.5 rounded-card border bg-card-grad p-4 text-left shadow-soft transition-[border-color,transform] duration-300 ${
                i === on
                  ? "border-white/[.2] md:-translate-y-2"
                  : "border-border hover:border-white/[.14]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Chip
                  tone={
                    x.risk === "high" || x.risk === "med" ? "bad" : "neutral"
                  }
                  dot
                >
                  {x.severity}
                </Chip>
                <Chip>{x.tools}</Chip>
              </span>
              <span className="text-[15px] text-fg leading-snug">
                <span className="font-mono text-[13px] text-dim">{x.id}</span>{" "}
                {x.title}
              </span>
              <span className="mt-auto truncate font-mono text-[12px] text-dim">
                {x.where}
              </span>
              <span className="lp-wheel-what text-[13px] text-body leading-relaxed">
                {x.what}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="lp-wheel-read px-4 text-center" aria-live="polite">
        <p className="text-[12.5px] text-dim">
          <span className="lp-wheel-hint-hover">Hover to read a finding</span>
          <span className="lp-wheel-hint-touch">Tap a card to read it</span>
        </p>
        {f && (
          <p
            key={f.id}
            className="lp-fadein mx-auto mt-3 max-w-[560px] text-[15px] text-body leading-relaxed"
          >
            <span className="text-fg">
              {f.id} {f.title}.
            </span>{" "}
            {f.what}
          </p>
        )}
      </div>
    </section>
  );
}
