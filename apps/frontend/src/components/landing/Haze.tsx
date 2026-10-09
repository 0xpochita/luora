"use client";

import { type ReactNode, useRef } from "react";
import { type Gsap, MOTION_MQ, useStage } from "./motion";

/**
 * Luora's stand-in for Genie's clouds: a rising perspective grid in a graphite haze. Used twice,
 * swallowing the hero on the way out and carrying the city up at the very end (symmetric).
 */
export function Haze({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" data-lp="haze" className={`lp-haze ${className}`}>
      <div className="lp-haze-grid" />
      <div data-lp-bg className="lp-haze-mist" />
    </div>
  );
}

/** Genie: the hero is swallowed by big clouds rising from below as you scroll into the next section. */
function heroExit(root: HTMLElement, gsap: Gsap) {
  const q = gsap.utils.selector(root);
  gsap
    .timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      },
    })
    // starts below the first screen (HI/HJ), so the hero's own sky closes it
    .fromTo(
      q("[data-lp=haze]"),
      { yPercent: 80 },
      { yPercent: -8, ease: "none" },
      0,
    )
    .fromTo(
      q(".lp-haze-grid"),
      { backgroundPositionY: "0px" },
      { backgroundPositionY: "-320px", ease: "none" },
      0,
    )
    .to(
      q("[data-lp=hero-body]"),
      { y: -140, autoAlpha: 0, scale: 0.96, ease: "power1.in" },
      0,
    )
    .to(q("[data-lp=hero-sky]"), { autoAlpha: 0 }, 0);
}

export function HeroExit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, heroExit, MOTION_MQ);
  return (
    <header ref={ref} data-tone="hero" className="relative overflow-hidden">
      {children}
      <Haze className="bottom-0 z-20" />
    </header>
  );
}

/**
 * Genie: the footer is closed by clouds rising again, mirroring the hero. Here the backlit city
 * skyline (CityHorizon) climbs up with the last screens of scroll, the same haze rising behind it.
 */
function finaleRise(root: HTMLElement, gsap: Gsap) {
  const q = gsap.utils.selector(root);
  gsap
    .timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top bottom",
        end: "bottom bottom",
        scrub: 0.5,
      },
    })
    .fromTo(q("[data-lp=city]"), { yPercent: 45 }, { yPercent: 0 }, 0)
    .fromTo(q("[data-lp=haze]"), { yPercent: 70 }, { yPercent: 5 }, 0)
    .fromTo(
      q(".lp-haze-grid"),
      { backgroundPositionY: "0px" },
      { backgroundPositionY: "-320px" },
      0,
    )
    .fromTo(
      q("[data-lp=finale-body]"),
      { y: 90, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, ease: "power2.out", duration: 0.6 },
      0,
    );
}

export function FinaleRise({
  city,
  children,
}: {
  city: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, finaleRise, MOTION_MQ);
  return (
    <section ref={ref} data-tone="finale" className="relative overflow-hidden">
      <Haze className="bottom-0" />
      <div data-lp="city" className="pointer-events-none absolute inset-0">
        {city}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
