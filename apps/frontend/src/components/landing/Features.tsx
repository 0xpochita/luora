import Link from "next/link";
import type { ReactNode } from "react";
import {
  CoverageWidget,
  FindingsWidget,
  LabWidget,
  TraceWidget,
} from "./FeatureWidgets";
import { Reveal } from "./motion";
import { demoAtlas, labDemo, traceFrames } from "./stats";

type Row = {
  id: string;
  kicker: string;
  title: string;
  lead: string;
  body: string;
  points: string[];
  /** where the feature lives in the app */
  href: string;
};

const ROWS: Row[] = [
  {
    id: "trace",
    href: "/trace",
    kicker: "Trace",
    title: "Every frame of forge\u00a0\u2011vvvv, decoded.",
    lead: "Read the call, not the hex.",
    body: "Each call, event and cheatcode is decoded with your project's own ABIs, linked to the source lines it executed, and laid out as a call graph.",
    points: [
      "Args and return values",
      "Executed lines per frame",
      "Storage reads and writes",
      "Call graph view",
    ],
  },
  {
    id: "lab",
    href: "/atlas",
    kicker: "Lab",
    title: "Write the test as a graph.",
    lead: "Actors, calls, expected reverts, invariants.",
    body: "Wire a scenario onto the real contract graph and run it in the browser. Export it as a .t.sol file that runs under forge test.",
    points: [
      "Actors with roles and balances",
      "Expect revert with a reason",
      "Asserts and invariant checks",
      "Export to a Foundry test",
    ],
  },
  {
    id: "findings",
    href: "/atlas",
    kicker: "Findings",
    title: "Two analyzers, one list.",
    lead: "Slither and Aderyn, deduplicated.",
    body: "Reports of the same issue in the same function merge into one finding that keeps every detector that agreed. Triage each one, then download the confirmed set as a Markdown report.",
    points: [
      "Severity and tool filters",
      "Flagged source lines",
      "Confirm, false positive, duplicate",
      "Markdown report",
    ],
  },
  {
    id: "coverage",
    href: "/atlas",
    kicker: "Coverage",
    title: "See what the tests never touched.",
    lead: "forge coverage, folded onto the contract.",
    body: "Line, branch and function coverage for each entry point, and an audit focus list that puts untested state-changing code first.",
    points: [
      "Coverage per function",
      "Branches never taken",
      "Hit counts in the source gutter",
      "Least tested first",
    ],
  },
];

/**
 * R21 (pin 489273947042736110, 'Technical Solutions That Go Beyond Limits'): per feature, copy with
 * short checked bullets and a link on one side, ONE focused product widget on the other; sides
 * alternate (R4). Widgets (FeatureWidgets.tsx, R11 / R16) render the app's own UI on the sample data,
 * centred with generous padding on the faint dot grid, nothing running off the edge.
 */
export async function Features() {
  const [atlas, trace, lab] = await Promise.all([
    demoAtlas(),
    traceFrames(),
    labDemo(),
  ]);
  const widget: Record<string, ReactNode> = {
    trace: <TraceWidget test={trace.test} frames={trace.frames} />,
    lab: lab && <LabWidget {...lab} />,
    findings: <FindingsWidget atlas={atlas} />,
    coverage: <CoverageWidget atlas={atlas} />,
  };
  return (
    <section
      id="product"
      className="mx-auto flex max-w-[1240px] flex-col gap-28 px-4 pb-32 md:gap-40 md:px-6"
    >
      {ROWS.map((r, i) => (
        <Reveal key={r.id}>
          <article
            id={r.id}
            className={`grid grid-cols-1 items-center gap-10 md:gap-16 ${i % 2 ? "md:grid-cols-[7fr_5fr]" : "md:grid-cols-[5fr_7fr]"}`}
          >
            <div className={i % 2 ? "md:order-2" : ""}>
              <p className="flex items-center gap-2 text-[13px] text-text">
                <span className="size-1.5 rounded-full bg-white" />
                {r.kicker}
              </p>
              <h2 className="mt-4 font-medium text-[clamp(30px,3.6vw,44px)] text-fg leading-[1.06] tracking-[-0.025em]">
                {r.title}
              </h2>
              <p className="mt-5 max-w-[440px] text-[16px] text-muted leading-relaxed">
                <span className="text-fg">{r.lead}</span> {r.body}
              </p>
              {/* R21: short checked bullets, monochrome check */}
              <ul className="mt-8 grid max-w-[440px] grid-cols-2 gap-x-6 gap-y-3">
                {r.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[13px] text-body"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      className="mt-[2px] size-4 flex-none rounded-full bg-white/[.08] p-[3px] text-fg"
                    >
                      <path
                        d="M3.5 8.5l3 3 6-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={r.href}
                className="mt-9 inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-raised px-4 py-2 text-[13.5px] text-fg transition-colors hover:bg-hover"
              >
                Open in the app
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-3.5 text-muted"
                >
                  <path
                    d="M5 11l6-6M6 5h5v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
            <div
              className={`dot-grid grid min-w-0 grid-cols-1 place-items-center rounded-card border border-white/[.07] px-4 py-12 sm:px-8 md:px-10 md:py-16 ${i % 2 ? "md:order-1" : ""}`}
            >
              {widget[r.id]}
            </div>
          </article>
        </Reveal>
      ))}
    </section>
  );
}
