"use client";

import { useEffect, useRef, useState } from "react";
import { nodeHeight } from "@/features/atlas/utils/lab-graph";
import { LabGraph } from "./FeatureWidgets";
import { type Gsap, useStage } from "./motion";
import type { LabDemo } from "./stats";

/**
 * where each scenario card floats around the sentence, in graph pixels from the graph's centre
 * (Actor, Call, Expect revert, Assert in template order; extra cards reuse the last spots)
 */
const FLOAT = [
  { x: -620, y: -250, r: -9 },
  { x: 600, y: -280, r: 7 },
  { x: -560, y: 300, r: 6 },
  { x: 640, y: 260, r: -8 },
];

/**
 * Genie: the pinned sentence 'You can [+ Create] with one click', the product's own button sitting
 * inside the sentence and result tiles floating around it. Here the button is the Lab's Run pill
 * (accent), the tiles are the cards of the Lab's real 'Non-owner cannot setOracle' scenario
 * (stats.ts scenarioDemo: Actor, Call setOracle, Expect revert, Assert). With the scroll the
 * sentence rises out of the way, Run is pressed, the cards settle into the scenario graph, its
 * wires draw in and the run result badges appear.
 */
function runSentence(root: HTMLElement, gsap: Gsap) {
  const q = gsap.utils.selector(root);
  const graph = q("[data-lp=graph]")[0] as HTMLElement;
  const w = Number(graph.dataset.w);
  const h = Number(graph.dataset.h);
  const cards = q(".lab-card");
  const off = cards.map((el, i) => {
    const f = FLOAT[Math.min(i, FLOAT.length - 1)];
    const cx = el.offsetLeft + el.offsetWidth / 2 - w / 2;
    const cy = el.offsetTop + el.offsetHeight / 2 - h / 2;
    return { x: f.x - cx, y: f.y - cy, r: f.r };
  });
  gsap.set(cards, {
    x: (i) => off[i].x,
    y: (i) => off[i].y,
    rotate: (i) => off[i].r,
  });
  gsap.set(q(".lab-wires, .badge.st"), { autoAlpha: 0 });

  gsap
    .timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=220%",
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })
    // the floating tiles drift a little while the sentence holds the screen
    .to(cards, { y: (i) => off[i].y - 40, duration: 1.2, ease: "none" })
    // Run is pressed
    .to(
      q("[data-lp=run]"),
      { scale: 0.92, duration: 0.25, ease: "power1.in" },
      "-=0.3",
    )
    .to(q("[data-lp=run]"), { scale: 1, duration: 0.35, ease: "back.out(3)" })
    // the sentence rises out of the way, the cards settle into the graph
    .addLabel("settle")
    .fromTo(
      q("[data-lp=sentence]"),
      { y: 0, scale: 1 },
      { y: () => -(innerHeight / 2 - 120), scale: 0.62, duration: 2 },
      "settle",
    )
    .to(cards, { x: 0, y: 0, rotate: 0, duration: 2, stagger: 0.08 }, "settle")
    .fromTo(graph, { y: 0 }, { y: 50, duration: 2 }, "settle")
    // wires draw in, then the run results
    .to(q(".lab-wires"), { autoAlpha: 1, duration: 0.6 }, "settle+=1.9")
    .to(q(".badge.st"), { autoAlpha: 1, duration: 0.4, stagger: 0.15 }, ">-0.2")
    .to({}, { duration: 1 });
}

export function RunSentence({ scenario }: { scenario: LabDemo }) {
  const ref = useRef<HTMLElement>(null);
  useStage(ref, runSentence);
  const { nodes } = scenario;
  const w = Math.max(...nodes.map((n) => n.x + n.w));
  const h = Math.max(...nodes.map((n) => n.y + nodeHeight(n)));
  // fit the graph to its column (0.9 at most), like LabWidget
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.9);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setK(Math.min(0.9, e.contentRect.width / w)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <section ref={ref} data-tone="run" className="lp-run">
      <p
        data-lp="sentence"
        className="lp-run-sentence relative z-10 mx-auto max-w-[900px] px-4 text-center font-light text-[clamp(34px,5.4vw,72px)] text-fg leading-[1.15] tracking-[-0.035em]"
      >
        You can{" "}
        <span
          data-lp="run"
          className="inline-flex translate-y-[-0.12em] items-center gap-[0.3em] rounded-[0.32em] bg-mint px-[0.42em] py-[0.12em] align-middle font-normal text-[0.62em] text-primary-fg shadow-[0_10px_40px_-8px_rgba(134,239,172,.45)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-[0.7em]"
            fill="currentColor"
          >
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
          Run
        </span>{" "}
        a scenario
        <br />
        <span className="text-white/45">with one click.</span>
      </p>
      <div ref={box} className="lp-run-graph">
        <div
          data-lp="graph"
          data-w={w}
          data-h={h}
          className="relative mx-auto"
          style={{ width: w * k, height: h * k }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: w, height: h, transform: `scale(${k})` }}
          >
            <LabGraph
              nodes={nodes}
              wires={scenario.wires}
              runs={scenario.runs}
              fields={scenario.fields}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
