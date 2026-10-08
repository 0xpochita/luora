import Image from "next/image";
import { Reveal } from "./motion";

type Row = {
  id: string;
  kicker: string;
  title: string;
  lead: string;
  body: string;
  points: string[];
  shot: { src: string; w: number; h: number; alt: string };
  /** float a small capture on the dot grid instead of bleeding a wide one off the card */
  floating?: boolean;
};

const ROWS: Row[] = [
  {
    id: "trace",
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
    shot: {
      src: "/landing/trace.webp",
      w: 2304,
      h: 1616,
      alt: "Luora trace view of test_depositThenWithdraw: decoded frames for vm.prank, LuoraVault.deposit, MockUSDC.transferFrom and their events, next to the contract source.",
    },
  },
  {
    id: "lab",
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
    shot: {
      src: "/landing/lab-scenario.webp",
      w: 1800,
      h: 1020,
      alt: "Lab scenario 'Non-owner cannot setOracle': an actor wired to a setOracle call, an expect-revert node and an assert node, with the run panel reporting all checks hold and an export button for the .t.sol file.",
    },
  },
  {
    id: "findings",
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
    shot: {
      src: "/landing/findings.webp",
      w: 2040,
      h: 540,
      alt: "Findings tray: Slither 12, Aderyn 18, Manual 6 filters, and cards such as F-01 State written after external call in deposit, reported by Aderyn, Manual and Slither.",
    },
  },
  {
    id: "coverage",
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
    shot: {
      src: "/landing/coverage.webp",
      w: 800,
      h: 656,
      alt: "Test coverage panel: lines 98% (51 of 52), branches 69% (9 of 13), functions 100%, and an audit focus list led by setOracle() at 0%.",
    },
    floating: true,
  },
];

/** R4: copy column with a 2×2 of tiny points, real product UI fading out beside it; sides alternate. */
export function Features() {
  return (
    <section
      id="product"
      className="mx-auto flex max-w-[1240px] flex-col gap-28 px-4 pb-32 md:gap-40 md:px-6"
    >
      {ROWS.map((r, i) => (
        <Reveal key={r.id}>
          <article
            id={r.id}
            className={`grid items-center gap-10 md:gap-16 ${i % 2 ? "md:grid-cols-[7fr_5fr]" : "md:grid-cols-[5fr_7fr]"}`}
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
              <ul className="mt-8 grid max-w-[440px] grid-cols-2 gap-x-6 gap-y-3">
                {r.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[13px] text-body"
                  >
                    <span className="mt-[7px] size-1 flex-none rounded-full bg-white/50" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={`relative overflow-hidden rounded-card border border-white/[.07] ${
                r.floating
                  ? "dot-grid grid place-items-center px-6 py-14 md:py-20"
                  : "bg-canvas"
              } ${i % 2 ? "md:order-1" : ""}`}
              style={
                r.floating
                  ? undefined
                  : { height: Math.min(460, r.shot.h / 2 + 24) }
              }
            >
              {/* R4: the UI at its real size, running off the card and fading out */}
              {r.floating ? (
                <Image
                  src={r.shot.src}
                  alt={r.shot.alt}
                  width={r.shot.w}
                  height={r.shot.h}
                  sizes="400px"
                  className="w-full max-w-[400px] rounded-card shadow-float"
                />
              ) : (
                <div
                  className={`absolute inset-0 pt-6 pl-6 ${
                    r.shot.h / 2 + 24 > 460
                      ? "[mask-composite:intersect] [mask-image:linear-gradient(to_right,#000_60%,transparent),linear-gradient(to_bottom,#000_55%,transparent)]"
                      : "[mask-image:linear-gradient(to_right,#000_60%,transparent)]"
                  }`}
                >
                  <Image
                    src={r.shot.src}
                    alt={r.shot.alt}
                    width={r.shot.w}
                    height={r.shot.h}
                    sizes={`${r.shot.w / 2}px`}
                    style={{ width: r.shot.w / 2, maxWidth: "none" }}
                    className="rounded-tl-[12px]"
                  />
                </div>
              )}
            </div>
          </article>
        </Reveal>
      ))}
    </section>
  );
}
