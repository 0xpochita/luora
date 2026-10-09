"use client";

import type { gsap as GsapNs } from "gsap";
import type { ScrollTrigger as ScrollTriggerNs } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import {
  type ReactNode,
  type RefObject,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import "lenis/dist/lenis.css";

export type Gsap = typeof GsapNs;
type Motion = { gsap: Gsap; ScrollTrigger: typeof ScrollTriggerNs };
let motion: Promise<Motion> | undefined;
/**
 * GSAP + ScrollTrigger as their own chunk, out of the page's first script: requested as soon as
 * this module runs in the browser (in parallel with hydration), awaited by every stage. All stages
 * wait on the same promise, so their setups still run in page order, before SmoothScroll refreshes.
 */
export function loadMotion() {
  motion ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([g, s]) => {
      g.gsap.registerPlugin(s.ScrollTrigger);
      return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
    },
  );
  return motion;
}
if (typeof window !== "undefined") void loadMotion();

/** runs `fn` with GSAP once it has loaded, unless the effect was cleaned up first; returns the cleanup */
function withMotion(fn: (m: Motion) => (() => void) | undefined) {
  let undo: (() => void) | undefined;
  let dead = false;
  void loadMotion().then((m) => {
    if (!dead) undo = fn(m);
  });
  return () => {
    dead = true;
    undo?.();
  };
}

/**
 * Pinned, scrubbed stages only run here. Below md, or with reduced motion, every stage is its
 * static, readable layout (the same query gates the `.lp-staged` CSS in landing.css).
 */
export const STAGE_MQ =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
/** cheap scrubbed fades and lifts, phones included */
export const MOTION_MQ = "(prefers-reduced-motion: no-preference)";

/**
 * Runs a module-level `setup(root, gsap)` inside gsap.matchMedia scoped to `root`, so every tween
 * and ScrollTrigger it makes is reverted on unmount or when the query stops matching.
 */
export function useStage(
  ref: RefObject<HTMLElement | null>,
  setup: (root: HTMLElement, gsap: Gsap) => void,
  mq = STAGE_MQ,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return withMotion(({ gsap }) => {
      const mm = gsap.matchMedia(root);
      mm.add(mq, () => setup(root, gsap));
      return () => mm.revert();
    });
  }, [ref, setup, mq]);
}

/**
 * Genie: one background that never cuts, its colour drifting between sections. Each landing section
 * carries `data-tone`; while the next section's top climbs the last viewport height to the top
 * edge, the backdrop blends into its tone. Written as --lp-bg / --lp-glow / --lp-gx / --lp-gy on the
 * backdrop itself, and --lp-bg on every `[data-lp-bg]` element that has to melt into the page
 * (collars, fades). Never on :root: an inherited property changing there restyles the whole page
 * on every scroll frame.
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
  ask: { bg: [16, 15, 14], glow: 0.07, x: 30, y: 80 },
  compare: { bg: [7, 7, 8], glow: 0.05, x: 30, y: 30 },
  faq: { bg: [4, 4, 5], glow: 0.04, x: 50, y: 60 },
  finale: { bg: [0, 0, 0], glow: 0, x: 50, y: 100 },
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** the page's Lenis instance while SmoothScroll is mounted (none under reduced motion or on touch) */
let lenisNow: Lenis | undefined;
/** scroll the page to `y` through Lenis when it runs, so a jump stays smooth and in sync */
export function scrollToY(y: number) {
  if (lenisNow) lenisNow.scrollTo(y, { duration: 1.2 });
  else scrollTo({ top: y });
}

function useBackdrop(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const backdrop = ref.current;
    if (!backdrop) return;
    let marks: { top: number; tone: string }[] = [];
    let melts: HTMLElement[] = [];
    let last = "";
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
      const bg = `rgb(${cur.bg.map(Math.round).join(" ")})`;
      const key = `${bg}|${cur.glow.toFixed(3)}|${cur.x.toFixed(1)}|${cur.y.toFixed(1)}`;
      // most of the page sits inside one tone: nothing to write
      if (key === last) return;
      last = key;
      backdrop.style.setProperty("--lp-bg", bg);
      backdrop.style.setProperty("--lp-glow", cur.glow.toFixed(3));
      backdrop.style.setProperty("--lp-gx", `${cur.x.toFixed(1)}%`);
      backdrop.style.setProperty("--lp-gy", `${cur.y.toFixed(1)}%`);
      for (const el of melts) el.style.setProperty("--lp-bg", bg);
    };
    return withMotion(({ ScrollTrigger }) => {
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onRefresh: (self) => {
          marks = [
            ...document.querySelectorAll<HTMLElement>("[data-tone]"),
          ].map((el) => ({
            top: el.getBoundingClientRect().top + scrollY,
            tone: el.dataset.tone ?? "",
          }));
          melts = [...document.querySelectorAll<HTMLElement>("[data-lp-bg]")];
          last = "";
          paint(self.scroll());
        },
        onUpdate: (self) => paint(self.scroll()),
      });
      return () => {
        st.kill();
        for (const el of melts) el.style.removeProperty("--lp-bg");
      };
    });
  }, [ref]);
}

/**
 * Genie: Lenis smooth scroll driven by the GSAP ticker so ScrollTrigger reads the same frame.
 * Landing only (mounted by app/page.tsx); off under reduced motion and on touch screens. Also owns
 * the fixed backdrop and refreshes ScrollTrigger once every section below has created its pins.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const backdrop = useRef<HTMLDivElement>(null);
  useBackdrop(backdrop);
  useEffect(() => {
    let refresh = () => {};
    // touch screens keep their native (compositor) scroll: Lenis would only add main-thread work
    // there, so they never even download it
    const smooth = !matchMedia(
      "(prefers-reduced-motion: reduce), (pointer: coarse)",
    ).matches;
    let dead = false;
    let undo = () => {};
    void Promise.all([loadMotion(), smooth ? import("lenis") : null]).then(
      ([{ gsap, ScrollTrigger }, mod]) => {
        if (dead) return;
        refresh = () => ScrollTrigger.refresh();
        if (mod) {
          const lenis = new mod.default({
            autoRaf: false,
            anchors: true,
            lerp: 0.1,
          });
          const raf = (t: number) => lenis.raf(t * 1000);
          lenisNow = lenis;
          lenis.on("scroll", ScrollTrigger.update);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          undo = () => {
            gsap.ticker.remove(raf);
            gsap.ticker.lagSmoothing(500, 33);
            lenis.destroy();
            lenisNow = undefined;
          };
        }
        refresh();
        document.fonts?.ready.then(() => refresh());
      },
    );
    // widgets that size themselves after mount (Lab graph, fitted mini UIs) change the page height
    // after the first refresh; re-measure once it settles so no trigger fires late
    let h = document.body.scrollHeight;
    let t = 0;
    const ro = new ResizeObserver(() => {
      // sub-pixel rounding (fitted widgets) moves no trigger visibly: not worth a full refresh
      if (Math.abs(document.body.scrollHeight - h) < 4) return;
      clearTimeout(t);
      t = window.setTimeout(() => {
        refresh();
        h = document.body.scrollHeight;
      }, 250);
    });
    // <body> is h-full (always one viewport tall): watch the page's own wrapper, which grows
    ro.observe(backdrop.current?.parentElement ?? document.body);
    // ambient loops (beam drift, starburst, carets, SMIL packets) stop while their section is
    // off screen, so scrolling elsewhere never repaints them (landing.css `[data-off]`)
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        const el = e.target as HTMLElement;
        el.toggleAttribute("data-off", !e.isIntersecting);
        for (const svg of el.querySelectorAll<SVGSVGElement>("svg[data-smil]"))
          if (e.isIntersecting) svg.unpauseAnimations();
          else svg.pauseAnimations();
      }
    });
    for (const el of document.querySelectorAll("[data-tone]")) io.observe(el);
    return () => {
      dead = true;
      undo();
      io.disconnect();
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);
  return (
    <>
      <div ref={backdrop} aria-hidden="true" className="lp-backdrop" />
      {children}
    </>
  );
}

/**
 * Mounts heavy live UI only once its spot comes within `margin` of the screen, so the server HTML
 * and the first hydration skip it. A spot under display:none (the other of two responsive layouts)
 * never intersects, so that copy is never built. Until then `className` sizes the empty spot.
 * The build runs as a transition: React renders it in slices between frames instead of one long
 * task in the middle of a scroll. `wait`: what the children need first (their code chunk, the
 * atlas), loaded once the spot nears the screen; the spot keeps its size until they can draw.
 */
export function Lazy({
  children,
  className,
  margin = "100% 0px",
  wait,
  fallback,
}: {
  children: ReactNode;
  className?: string;
  margin?: string;
  wait?: () => Promise<unknown>;
  /** drawn in the empty spot until then */
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (on || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        void Promise.resolve(wait?.()).then(() =>
          startTransition(() => setOn(true)),
        );
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on, margin, wait]);
  return on ? (
    children
  ) : (
    <div ref={ref} className={className}>
      {fallback}
    </div>
  );
}

/**
 * Genie-style entrance: the block fades and lifts with the scroll (scrubbed, so it also plays back
 * on the way up). Static under reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return withMotion(({ gsap }) => {
      const mm = gsap.matchMedia(el);
      mm.add(MOTION_MQ, () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 64 },
          {
            autoAlpha: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: `top ${96 - delay * 80}%`,
              end: `top ${62 - delay * 80}%`,
              scrub: 0.6,
            },
          },
        );
      });
      return () => mm.revert();
    });
  }, [delay]);
  return (
    <div ref={ref} className={className}>
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
    return withMotion(({ gsap }) => {
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
    });
  }, []);
  return (
    <div ref={ref} className="origin-bottom">
      {children}
    </div>
  );
}
