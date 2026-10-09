"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { LogoText } from "@/components/ui";
import { type Gsap, useStage } from "./motion";
import "./hub.css";

/** how far each mark flies off its arm when the hub scatters, in a 1440-wide viewport (scaled) */
const SCATTER = [
  { x: -200, y: -230, r: -16 },
  { x: 150, y: 50, r: 10 },
  { x: 190, y: -60, r: 14 },
];
const SQ = 56;

/**
 * Tenth pass: before it scatters, the row is a hub (hub.css, refs W1–W3, B1–B2): the three marks
 * on arms wired into the Luora core, one ring and a lit grid behind. (Nineteenth pass, "terlalu
 * banyak komponen dan teks": the eyebrow, the wire labels, the core's file name, the ticks ring
 * and the lit-arc ring were dropped; the marks' names stay.)
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
  const rings = q("[data-lp=rings]");
  const core = q("[data-lp=core]");
  const shot = q("[data-lp=frame]")[0] as HTMLElement;
  const win = shot.firstElementChild as HTMLElement;
  const square = q("[data-lp=square]");
  const k = () => Math.min(1.15, innerWidth / 1440);
  const clipFrom = () => {
    const y = shot.offsetHeight / 2 - SQ / 2;
    const x = shot.offsetWidth / 2 - SQ / 2;
    return `inset(${y}px ${x}px ${y}px ${x}px round 14px)`;
  };
  // where a mark (or the core) has to travel to meet the square as it appears: the frame's centre,
  // still lowered by the 12vh the window rises from
  const sq = square[0].getBoundingClientRect();
  const toSquare = (el: HTMLElement) => {
    const r = (el.querySelector(".lp-mark") ?? el).getBoundingClientRect();
    return {
      x: sq.left + sq.width / 2 - (r.left + r.width / 2),
      y: sq.top + sq.height / 2 + innerHeight * 0.12 - (r.top + r.height / 2),
    };
  };
  const home = marks.map((el) => toSquare(el));
  const meet = toSquare(core[0]);

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
    // 1. the hub comes apart: labels and wires go, the rings turn and open, the marks scatter
    // (fromTo everywhere: invalidateOnRefresh must never record a later state)
    .fromTo(
      q("[data-lp=wire]"),
      { autoAlpha: 1 },
      { autoAlpha: 0, duration: 0.9 },
    )
    .fromTo(
      rings,
      { rotate: 0, scale: 1, autoAlpha: 1 },
      { rotate: 36, scale: 1.12, autoAlpha: 0.55, duration: 3 },
      0,
    )
    .fromTo(
      marks,
      { x: 0, y: 0, rotate: 0, scale: 1, autoAlpha: 1 },
      {
        x: (i) => SCATTER[i].x * k(),
        y: (i) => SCATTER[i].y * k(),
        rotate: (i) => SCATTER[i].r,
        duration: 3,
      },
      0,
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
      core,
      { x: 0, y: 0, rotate: 0 },
      { x: meet.x, y: meet.y, rotate: -4, duration: 1.4 },
      "<",
    )
    .fromTo(
      rings,
      { scale: 1.12, autoAlpha: 0.55 },
      { scale: 0.5, autoAlpha: 0, duration: 1.4, ease: "power2.in" },
      "<",
    )
    .fromTo(
      q("[data-lp=head]"),
      { y: 0, autoAlpha: 1 },
      { y: -60, autoAlpha: 0, duration: 1.2 },
      "<",
    )
    // the core hands over to the square in the same spot, at the same size
    .fromTo(
      square,
      { autoAlpha: 0, scale: 0.85 },
      { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" },
      "-=0.4",
    )
    .fromTo(core, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5 }, "<")
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
    .fromTo(
      q("[data-lp=bg]"),
      { autoAlpha: 1 },
      { autoAlpha: 0.35, duration: 3.4 },
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
  // the packets only loop while the stage is on screen
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      el.toggleAttribute("data-live", e.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} id="product" data-tone="product" className="lp-sg">
      <div data-lp="head" className="lp-sg-head px-4 text-center">
        <h2 className="font-medium text-[clamp(30px,4vw,50px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Start from your own run,
          <br />
          <span className="text-white/45">not a blank file.</span>
        </h2>
      </div>
      <div className="lp-hub">
        <div aria-hidden="true" data-lp="bg" className="lp-hub-bg" />
        <div className="lp-hub-o">
          <div aria-hidden="true" data-lp="rings" className="lp-hub-rings">
            <span className="lp-hub-ring" />
          </div>
          <span aria-hidden="true" data-lp="wire" className="lp-hub-axis" />
          {[
            ["180deg", "var(--hx)"],
            ["90deg", "var(--hy)"],
            ["0deg", "var(--hx)"],
          ].map(([a, arm], i) => (
            <span
              key={a}
              aria-hidden="true"
              data-lp="wire"
              className="lp-hub-wire"
              style={{ "--a": a, "--arm": arm } as React.CSSProperties}
            >
              <i style={{ animationDelay: `${i * -1.1}s` }} />
            </span>
          ))}
          <div data-lp="core" className="lp-hub-core">
            <LogoText height={20} />
          </div>
          <ul aria-label="Tools Luora works with" className="lp-hub-marks">
            {marks.map((m) => (
              <li key={m.title} data-lp="mark">
                <a
                  href={m.href}
                  className="group flex flex-col items-center gap-2.5"
                  aria-label={m.title}
                >
                  {/* crafted mark (lp-mark): one size, optically centred, a soft inner light (P1) */}
                  <span className="lp-mark">{m.node}</span>
                  <span className="whitespace-nowrap text-[13px] text-dim transition-colors group-hover:text-muted">
                    {m.title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="lp-sg-product">{children}</div>
    </section>
  );
}
