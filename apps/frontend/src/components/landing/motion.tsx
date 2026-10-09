"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";
import "lenis/dist/lenis.css";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * Pinned, scrubbed stages only run here. Below md, or with reduced motion, every stage is its
 * static, readable layout (the same query gates the `.lp-staged` CSS in landing.css).
 */
export const STAGE_MQ =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
/** cheap scrubbed fades and lifts, phones included */
export const MOTION_MQ = "(prefers-reduced-motion: no-preference)";

/**
 * Runs a module-level `setup(root)` inside gsap.matchMedia scoped to `root`, so every tween and
 * ScrollTrigger it makes is reverted on unmount or when the query stops matching.
 */
export function useStage(
  ref: RefObject<HTMLElement | null>,
  setup: (root: HTMLElement) => void,
  mq = STAGE_MQ,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);
    mm.add(mq, () => setup(root));
    return () => mm.revert();
  }, [ref, setup, mq]);
}

/**
 * Genie: one background that never cuts, its colour drifting between sections. Each landing section
 * carries `data-tone`; while the next section's top climbs the last viewport height to the top
 * edge, the backdrop blends into its tone. Written to :root as --lp-bg / --lp-glow / --lp-gx / --lp-gy
 * so anything that has to melt into the page (collars, fades) can use var(--lp-bg).
 */
const TONES: Record<
  string,
  { bg: number[]; glow: number; x: number; y: number }
> = {
  hero: { bg: [0, 0, 0], glow: 0.09, x: 50, y: 0 },
  product: { bg: [9, 9, 11], glow: 0.07, x: 50, y: 18 },
  run: { bg: [12, 12, 14], glow: 0.06, x: 50, y: 50 },
  words: { bg: [6, 6, 7], glow: 0.05, x: 50, y: 40 },
  how: { bg: [10, 10, 12], glow: 0.04, x: 50, y: 60 },
  findings: { bg: [13, 13, 15], glow: 0.08, x: 50, y: 100 },
  tests: { bg: [9, 9, 11], glow: 0.05, x: 50, y: 50 },
  bento: { bg: [8, 8, 10], glow: 0.04, x: 50, y: 20 },
  ask: { bg: [11, 11, 13], glow: 0.06, x: 70, y: 40 },
  compare: { bg: [7, 7, 8], glow: 0.05, x: 30, y: 30 },
  statement: { bg: [3, 3, 4], glow: 0.04, x: 50, y: 60 },
  finale: { bg: [0, 0, 0], glow: 0, x: 50, y: 100 },
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** the page's Lenis instance while SmoothScroll is mounted (none under reduced motion) */
let lenisNow: Lenis | undefined;
/** scroll the page to `y` through Lenis when it runs, so a jump stays smooth and in sync */
export function scrollToY(y: number) {
  if (lenisNow) lenisNow.scrollTo(y, { duration: 1.2 });
  else scrollTo({ top: y });
}

function useBackdrop() {
  useEffect(() => {
    const root = document.documentElement;
    let marks: { top: number; tone: string }[] = [];
    const paint = (y: number) => {
      const vh = innerHeight;
      let t = TONES[marks[0]?.tone] ?? TONES.hero;
      let cur = { ...t, bg: [...t.bg] };
      for (const m of marks.slice(1)) {
        const k = Math.min(1, Math.max(0, (y - (m.top - vh)) / vh));
        if (!k) break;
        t = TONES[m.tone] ?? t;
        cur = {
          bg: cur.bg.map((c, i) => lerp(c, t.bg[i], k)),
          glow: lerp(cur.glow, t.glow, k),
          x: lerp(cur.x, t.x, k),
          y: lerp(cur.y, t.y, k),
        };
      }
      root.style.setProperty(
        "--lp-bg",
        `rgb(${cur.bg.map(Math.round).join(" ")})`,
      );
      root.style.setProperty("--lp-glow", cur.glow.toFixed(3));
      root.style.setProperty("--lp-gx", `${cur.x.toFixed(1)}%`);
      root.style.setProperty("--lp-gy", `${cur.y.toFixed(1)}%`);
    };
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onRefresh: (self) => {
        marks = [...document.querySelectorAll<HTMLElement>("[data-tone]")].map(
          (el) => ({
            top: el.getBoundingClientRect().top + scrollY,
            tone: el.dataset.tone ?? "",
          }),
        );
        paint(self.scroll());
      },
      onUpdate: (self) => paint(self.scroll()),
    });
    return () => {
      st.kill();
      for (const p of ["--lp-bg", "--lp-glow", "--lp-gx", "--lp-gy"])
        root.style.removeProperty(p);
    };
  }, []);
}

/**
 * Genie: Lenis smooth scroll driven by the GSAP ticker so ScrollTrigger reads the same frame.
 * Landing only (mounted by app/page.tsx); off under reduced motion. Also owns the fixed backdrop
 * and refreshes ScrollTrigger once every section below has created its pins.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useBackdrop();
  useEffect(() => {
    let lenis: Lenis | undefined;
    const raf = (t: number) => lenis?.raf(t * 1000);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.1 });
      lenisNow = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }
    ScrollTrigger.refresh();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    // widgets that size themselves after mount (Lab graph, fitted mini UIs) change the page height
    // after the first refresh; re-measure once it settles so no trigger fires late
    let h = document.body.scrollHeight;
    let t = 0;
    const ro = new ResizeObserver(() => {
      if (document.body.scrollHeight === h) return;
      clearTimeout(t);
      t = window.setTimeout(() => {
        ScrollTrigger.refresh();
        h = document.body.scrollHeight;
      }, 250);
    });
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
      lenisNow = undefined;
    };
  }, []);
  return (
    <>
      <div aria-hidden="true" className="lp-backdrop" />
      {children}
    </>
  );
}

/**
 * Genie-style entrance: the block fades and lifts with the scroll (scrubbed, so it also plays back
 * on the way up). Sets data-in once it has entered, for the R32 rings. Static under reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  tilt = false,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  /** also tips up from a slight backward tilt and scale (cards rising into place) */
  tilt?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add(MOTION_MQ, () => {
      gsap.fromTo(
        el,
        tilt
          ? {
              autoAlpha: 0,
              y: 96,
              scale: 0.94,
              rotateX: 14,
              transformPerspective: 1200,
              transformOrigin: "50% 100%",
            }
          : { autoAlpha: 0, y: 64 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          ease: tilt ? "power2.out" : "none",
          scrollTrigger: {
            trigger: el,
            start: `top ${96 - delay * 80}%`,
            end: `top ${62 - delay * 80}%`,
            scrub: 0.6,
            onEnter: () => {
              el.dataset.in = "";
            },
          },
        },
      );
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      el.dataset.in = "";
    });
    return () => mm.revert();
  }, [delay, tilt]);
  return (
    <div ref={ref} className={`lp-reveal ${className}`}>
      {children}
    </div>
  );
}

/**
 * Genie-style hand-over: as the block's bottom leaves, it sinks back (fades, shrinks a touch, lifts)
 * while the next section's entrance plays on top, so the two overlap instead of cutting.
 */
export function Exit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add(MOTION_MQ, () => {
      gsap.to(el, {
        autoAlpha: 0.12,
        scale: 0.96,
        y: -60,
        ease: "power1.in",
        scrollTrigger: {
          trigger: el,
          start: "bottom 75%",
          end: "bottom 15%",
          scrub: 0.6,
        },
      });
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className="origin-bottom">
      {children}
    </div>
  );
}

/**
 * Compare's scrubbed entrance (seventh pass). Genie's pricing card rises into place as you scroll
 * to it; here the raised Luora card (data-lp="card") slides up from below while the rows
 * (cells sharing data-row) reveal one after another, both scrubbed so they play back on the way up.
 */
export function CompareStage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useStage(
    ref,
    useCallback((root: HTMLElement) => {
      const q = gsap.utils.selector(root);
      gsap.fromTo(
        q("[data-lp=card]"),
        { y: 180, autoAlpha: 0, scale: 0.96 },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 90%",
            end: "top 35%",
            scrub: 0.6,
          },
        },
      );
      // each row on its own trigger, so a long (phone) list never hides rows already on screen
      const rows = new Map<string, HTMLElement[]>();
      for (const el of q("[data-row]") as HTMLElement[]) {
        const k = el.dataset.row ?? "";
        rows.set(k, [...(rows.get(k) ?? []), el]);
      }
      for (const cells of rows.values())
        gsap.fromTo(
          cells,
          { y: 28, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: cells[0],
              start: "top 96%",
              end: "top 72%",
              scrub: 0.6,
            },
          },
        );
    }, []),
    MOTION_MQ,
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
