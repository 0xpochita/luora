"use client";

import { type ReactNode, useRef } from "react";
import { Fragment } from "./CompareFragments";
import type { CompareData } from "./compare-data";
import { type Gsap, Lazy, MOTION_MQ, useStage } from "./motion";
import "./compare.css";

/*
 * Compare's eight rows as two worlds (twelfth pass, see index.ts): on the left of each row what
 * forge and the analyzer CLIs hand you, as the raw terminal text they print; on the right the same
 * thing as Luora renders it (CompareFragments, the sample run's own data). A lit seam rides the
 * edge of the Luora side as it wipes over the raw text with the scroll.
 *  C1 pin/677228862766302378 (Award OR Free, 'The bill is the bug'): each column states what
 *     everyone else does in faded type over what they do in bright type → the copy column: the CLI
 *     line fades back while the Luora line lights up.
 *  C2 pin/3307399721419408 ('Step Through. Work Smarter.'): two dark masses with one lit gap
 *     between them, the light spilling at its foot → the seam between the two worlds.
 *  C3 pin/281543726069847 (EqtyLab 'Verify to Trust AI'): thin curved light lines sweeping into one
 *     point under the product → the arcs converging on the seam, and the rounded, organic shells.
 */

/** One row: what you get, what Luora shows (a full sentence), what the CLIs give today (null = nothing). */
const ROWS: { what: string; luora: string; cli: string | null }[] = [
  {
    what: "Decoded calls, events and cheatcodes",
    luora: "Every call, event and cheatcode decoded with your own ABIs.",
    cli: "A text tree from forge -vvvv",
  },
  {
    what: "Source lines each frame executed",
    luora: "Each frame opens on the source lines it ran.",
    cli: "Step through them in forge debug",
  },
  {
    what: "Storage reads and writes per line",
    luora: "Slot reads and writes pinned to the line that made them.",
    cli: "Step through them in forge debug",
  },
  {
    what: "Call graph per test",
    luora: "A call graph drawn for every test.",
    cli: null,
  },
  {
    what: "Slither and Aderyn merged per issue",
    luora: "Slither and Aderyn merged into one finding per issue.",
    cli: "Two separate reports",
  },
  {
    what: "Triage status and Markdown report",
    luora: "Triage each finding, then export a Markdown report.",
    cli: null,
  },
  {
    what: "Coverage per function, untested first",
    luora: "Coverage per function, untested ones listed first.",
    cli: "A per-file table from forge coverage",
  },
  {
    what: "Wire a scenario, export a .t.sol",
    luora: "Wire actors and calls, export the scenario as a .t.sol.",
    cli: "Written by hand",
  },
];

/**
 * What the CLIs print for each row: the command, then its output. Built from the same run; the two
 * report excerpts are quoted from foundry/reports/slither.json and aderyn.json, the issue Luora's
 * exporter merges into one finding (luora-findings.mjs, class 'reentrancy').
 */
function raw(d: CompareData): string[][] {
  const test = d.graph.test.replace("()", "");
  const debug = `$ forge test --mt ${test} --debug`;
  return [
    [`$ forge test --mt ${test} -vvvv`, ...d.tree],
    [
      debug,
      d.tree[0] ?? "",
      "",
      "one opcode at a time, source in a side pane",
      "[j] next  [k] prev  [g] first  [G] last  [q] quit",
    ],
    [
      debug,
      ...d.ops.map((op, i) => `step ${String(i + 1).padStart(2, " ")}  ${op}`),
    ],
    [
      `$ forge test --mt ${test} -vvvv`,
      ...d.tree.slice(0, 3),
      "",
      "no call graph",
    ],
    [
      "$ cat reports/slither.json",
      '  "check": "reentrancy-no-eth",',
      '  "impact": "Medium",',
      '  "first_markdown_element": "src/LuoraVault.sol#L73-L79"',
      "$ cat reports/aderyn.json",
      '  "detector_name": "reentrancy-state-change",',
      '  "title": "Reentrancy: State change after external call",',
      '  "line_no": 75',
    ],
    [
      "$ slither . --json reports/slither.json",
      "",
      "no triage status, no report",
    ],
    [
      "$ forge coverage",
      "| File | % Lines | % Branches | % Funcs |",
      "|------|---------|------------|---------|",
      `| ${d.cov.file} | ${d.cov.lines} | ${d.cov.branches} | ${d.cov.funcs} |`,
    ],
    [`$ vim ${d.sol.file}`, ...d.sol.lines],
  ];
}

/** the title's lines rise out of their masks as the block approaches */
function rise(root: HTMLElement, gsap: Gsap) {
  gsap.fromTo(
    root.querySelectorAll("[data-rise]"),
    { yPercent: 105 },
    {
      yPercent: 0,
      ease: "power2.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: root,
        start: "top 92%",
        end: "top 45%",
        scrub: 0.6,
      },
    },
  );
}

/** one row's wipe: the Luora side's clip opens from the seam, the raw text dims, the copy swaps */
function wipe(
  gsap: Gsap,
  tl: ReturnType<Gsap["timeline"]>,
  row: HTMLElement,
  wide: boolean,
  at: string | number,
  duration: number,
) {
  const q = gsap.utils.selector(row);
  const read = q("[data-read]")[0] as HTMLElement;
  tl.fromTo(
    read,
    { clipPath: wide ? "inset(0% 0% 0% 100%)" : "inset(0% 0% 100% 0%)" },
    { clipPath: "inset(0% 0% 0% 0%)", duration },
    at,
  )
    .fromTo(
      q("[data-raw]"),
      { autoAlpha: 1 },
      { autoAlpha: 0.55, duration },
      at,
    )
    .fromTo(
      q("[data-them]"),
      { autoAlpha: 1 },
      { autoAlpha: 0.4, duration },
      at,
    )
    .fromTo(
      q("[data-us]"),
      { autoAlpha: 0.2, y: 10 },
      { autoAlpha: 1, y: 0, duration },
      at,
    );
  if (wide)
    tl.fromTo(
      q("[data-seam]"),
      { x: () => read.offsetWidth },
      { x: 0, duration },
      at,
    );
}

/**
 * Below 1024px (and under reduced motion the rows just sit there): the rows flow down the page,
 * each wiping as it climbs the screen.
 */
function flow(root: HTMLElement, gsap: Gsap) {
  rise(root, gsap);
  for (const row of root.querySelectorAll<HTMLElement>("[data-cmp]")) {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: row,
        start: "top 90%",
        end: "top 45%",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    wipe(gsap, tl, row, false, 0, 1);
  }
}

/**
 * Wide screens: the block pins and the eight rows take the same slot one at a time ("buatlah jeda
 * jadi pas scroll tunggu animasi selesai baru bisa scroll down"): a row arrives, its wipe runs with
 * the scroll, it holds finished, then it lifts away as the next one rises in. Nothing else moves
 * until the last row has wiped, so the page never shows eight half-open rows at once.
 */
function staged(root: HTMLElement, gsap: Gsap) {
  rise(root, gsap);
  const rows = [...root.querySelectorAll<HTMLElement>("[data-cmp]")];
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      // ~1.4 screens of scroll per row, so a short flick never skips rows; scrub 1 eases the
      // catch-up so a row change reads as one slow move
      end: () => `+=${rows.length * 140}%`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
  rows.forEach((row, i) => {
    const at = `r${i}`;
    tl.addLabel(at);
    if (i > 0) {
      tl.to(
        rows[i - 1],
        { autoAlpha: 0, y: -36, duration: 0.45, ease: "power1.in" },
        at,
      ).fromTo(
        row,
        { autoAlpha: 0, y: 36 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: "power1.out" },
        `${at}+=0.35`,
      );
    }
    wipe(gsap, tl, row, true, i > 0 ? `${at}+=0.8` : at, 1.2);
    // the finished row holds a while before the next one takes its place
    tl.to({}, { duration: 1 });
  });
}

export function CompareWorlds({ data }: { data: CompareData }) {
  const ref = useRef<HTMLDivElement>(null);
  // one setup per layout, so crossing 1024px reverts one and builds the other (compare.css stacks
  // the rows under the same query the pinned stage runs in)
  useStage(ref, staged, `${MOTION_MQ} and (min-width: 1024px)`);
  useStage(ref, flow, `${MOTION_MQ} and (max-width: 1023.98px)`);
  const out = raw(data);
  return (
    <div ref={ref} className="lp-cmp-stage">
      {/* C1 + C2: an editorial title, big and light, second line muted; the note at its foot */}
      <h2 className="font-light text-[clamp(40px,6.4vw,88px)] text-fg leading-[0.94] tracking-[-0.045em]">
        <span className="lp-cmp-line">
          <span data-rise>The CLIs print text.</span>
        </span>
        <span className="lp-cmp-line">
          <span data-rise className="text-white/40">
            Luora draws the contract.
          </span>
        </span>
      </h2>
      <div className="mt-8 flex flex-col-reverse gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
        <p className="flex items-center gap-3 text-[13px] text-dim">
          What the CLIs print
          <span
            aria-hidden="true"
            className="h-4 w-0.5 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,.35)]"
          />
          <span className="text-fg">What Luora draws from it</span>
        </p>
        <p className="max-w-[420px] text-[16px] text-muted leading-relaxed">
          Luora does not replace forge or the analyzers. It reads what they
          already produce and lays it over the contract.
        </p>
      </div>
      <ol className="lp-cmp-rows mt-14 space-y-6 md:mt-20 md:space-y-8">
        {ROWS.map((r, i) => (
          <li
            key={r.what}
            data-cmp
            className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-center lg:gap-12"
          >
            <div className="lg:pr-2">
              <p className="font-mono text-[12.5px] text-dim lg:text-[13.5px]">
                {String(i + 1).padStart(2, "0")} / 08
              </p>
              <h3 className="mt-2 font-medium text-[19px] text-fg leading-snug tracking-[-0.01em] lg:text-[25px]">
                {r.what}
              </h3>
              {/* C1: what everyone else does (faded) over what Luora does (lit) */}
              <p
                data-them
                className="mt-4 flex gap-2.5 text-[13.5px] text-dim leading-snug lg:mt-5 lg:text-[15.5px]"
              >
                <Mark on={false} />
                {r.cli ?? "Not in the CLIs"}
              </p>
              <p
                data-us
                className="mt-2 flex gap-2.5 text-[15px] text-fg leading-snug lg:mt-3 lg:text-[17.5px]"
              >
                <Mark on />
                {r.luora}
              </p>
            </div>
            <World raw={out[i]}>
              <Fragment i={i} data={data} />
            </World>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** a small ring: hollow for the CLIs, a lit dot inside for Luora */
function Mark({ on }: { on: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[2px] size-4 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <circle cx="8" cy="8" r="6.5" strokeOpacity={on ? 0.5 : 0.35} />
      {on ? (
        <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
      ) : null}
    </svg>
  );
}

/** C2 + C3: the raw world, the lit seam and its arcs, the Luora world clipped open over them */
function World({ raw, children }: { raw: string[]; children: ReactNode }) {
  return (
    <div className="lp-cmp-world">
      <div data-raw aria-hidden="true" className="lp-cmp-raw">
        {raw.map((l, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static lines, blanks repeat
          <span key={j} className={j === 0 ? "text-white/60" : undefined}>
            {l || " "}
          </span>
        ))}
      </div>
      <svg
        aria-hidden="true"
        className="lp-cmp-arcs"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M0 40C120 60 230 120 270 200" />
        <path d="M0 110C110 120 210 160 250 200" />
        <path d="M400 30C340 70 300 140 290 200" />
      </svg>
      <div data-read aria-hidden="true" className="lp-cmp-read">
        <Lazy className="h-full">{children}</Lazy>
      </div>
      <span data-seam aria-hidden="true" className="lp-cmp-seam" />
    </div>
  );
}
