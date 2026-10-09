"use client";

import { type ReactNode, useRef } from "react";
import { type Gsap, useStage } from "./motion";

/** where each mark lands when the row scatters, in a 1440-wide viewport (scaled to the real width) */
const SCATTER = [
  { x: -380, y: -130, r: -16 },
  { x: 30, y: 210, r: 10 },
  { x: 400, y: -60, r: 14 },
];
const SQ = 56;

/**
 * Genie: a pinned stage (~2.6 viewports). The row of round icons (three here: Foundry, Solidity,
 * Ethereum) scatters to random spots,
 * gathers back into the centre and fades, a tiny square appears there and grows into the full app
 * mockup, tilted on the way in and landing flat. Here the icons are the tools Luora reads and the
 * mockup is the live app (ProductTabs: Lab / Scenario / Trace / Flow / Map / Findings on the
 * sample run), whose view tabs fade in once the window has landed: one move from hero to product.
 */
function scatterGrow(root: HTMLElement, gsap: Gsap) {
  const q = gsap.utils.selector(root);
  const marks = q("[data-lp=mark]");
  const shot = q("[data-lp=frame]")[0] as HTMLElement;
  const win = shot.firstElementChild as HTMLElement;
  const square = q("[data-lp=square]");
  const k = () => Math.min(1.15, innerWidth / 1440);
  const clipFrom = () => {
    const y = shot.offsetHeight / 2 - SQ / 2;
    const x = shot.offsetWidth / 2 - SQ / 2;
    return `inset(${y}px ${x}px ${y}px ${x}px round 14px)`;
  };
  // where a mark has to travel to meet the centre of the stage
  const toCentre = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const s = root.getBoundingClientRect();
    return {
      x: s.left + s.width / 2 - (r.left + r.width / 2),
      y: s.top + innerHeight / 2 - (r.top + r.height / 2),
    };
  };
  const home = marks.map((el) => toCentre(el));

  gsap
    .timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=260%",
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })
    // 1. the row scatters (fromTo everywhere: invalidateOnRefresh must never record a later state)
    .fromTo(
      marks,
      { x: 0, y: 0, rotate: 0, scale: 1, autoAlpha: 1 },
      {
        x: (i) => SCATTER[i].x * k(),
        y: (i) => SCATTER[i].y * k(),
        rotate: (i) => SCATTER[i].r,
        duration: 3,
      },
    )
    // 2. everything gathers into the centre and goes, the heading lifts away
    .to(marks, {
      x: (i) => home[i].x,
      y: (i) => home[i].y,
      rotate: 0,
      scale: 0.3,
      autoAlpha: 0,
      duration: 1.4,
      ease: "power2.in",
    })
    .fromTo(
      q("[data-lp=head]"),
      { y: 0, autoAlpha: 1 },
      { y: -60, autoAlpha: 0, duration: 1.2 },
      "<",
    )
    .fromTo(
      square,
      { autoAlpha: 0, scale: 0.4 },
      { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" },
      "-=0.4",
    )
    // 3. the square grows into the live window, tilted on the way in, landing flat
    .addLabel("grow")
    .fromTo(
      win,
      { clipPath: clipFrom, autoAlpha: 0 },
      {
        clipPath: "inset(0px 0px 0px 0px round 18px)",
        autoAlpha: 1,
        duration: 3.4,
      },
      "grow",
    )
    .fromTo(
      square,
      { width: SQ, height: SQ, borderRadius: 14 },
      {
        width: () => shot.offsetWidth,
        height: () => shot.offsetHeight,
        borderRadius: 18,
        duration: 3.4,
      },
      "grow",
    )
    .fromTo(
      shot,
      { rotateX: 22, rotateZ: -4, y: () => innerHeight * 0.12 },
      { rotateX: 0, rotateZ: 0, y: 0, duration: 3.4 },
      "grow",
    )
    .to(square, { autoAlpha: 0, duration: 0.5 }, "grow+=3")
    // 4. the view tabs arrive, then a short hold on the app
    .fromTo(
      q("[data-lp=tabs]"),
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.8 },
      "grow+=2.9",
    )
    .to({}, { duration: 1.2 });
}

export function ScatterGrow({
  marks,
  children,
}: {
  marks: { title: string; href: string; node: ReactNode }[];
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, scatterGrow);
  return (
    <section ref={ref} id="product" data-tone="product" className="lp-sg">
      <div data-lp="head" className="lp-sg-head px-4 text-center">
        <p className="text-[13px] text-dim">Works with</p>
        <h2 className="mt-3 font-medium text-[clamp(30px,4vw,50px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Start from your own run,
          <br />
          <span className="text-white/45">not a blank file.</span>
        </h2>
      </div>
      <ul aria-label="Tools Luora works with" className="lp-sg-marks">
        {marks.map((m) => (
          <li key={m.title} data-lp="mark">
            <a
              href={m.href}
              className="group flex flex-col items-center gap-2.5"
              aria-label={m.title}
            >
              {/* crafted mark (lp-mark): one size, optically centred, a soft inner light (P1) */}
              <span className="lp-mark">{m.node}</span>
              <span className="text-[13px] text-dim transition-colors group-hover:text-muted">
                {m.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="lp-sg-product">{children}</div>
    </section>
  );
}
