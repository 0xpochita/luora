import Image from "next/image";
import { Reveal } from "./motion";

type Card = {
  src: string;
  w: number;
  h: number;
  alt: string;
  lead: string;
  text: string;
  span: string;
  /** where the capture sits in its window */
  place: string;
};

/** Crops of the real app at 2× (public/landing/b-*.webp), shown at their real size. */
const CARDS: Card[] = [
  {
    src: "/landing/b-source.webp",
    w: 776,
    h: 940,
    alt: "Source panel scrolled to F-01: lines 73 to 79 of LuoraVault.sol marked red, with hit counts in the gutter.",
    lead: "Findings on the line.",
    text: "Flagged lines turn red in the source, with forge coverage hit counts in the gutter.",
    span: "md:col-span-2",
    place: "left-6 top-6",
  },
  {
    src: "/landing/b-graph.webp",
    w: 940,
    h: 730,
    alt: "Call graph of test_depositThenWithdraw: MockOracle.getPrice, MockUSDC.transferFrom and the Transfer and Deposit events as nodes with decoded values and gas.",
    lead: "Call graph.",
    text: "One node per frame, with decoded args, return values and gas.",
    span: "md:col-span-2",
    place: "left-6 top-6",
  },
  {
    src: "/landing/b-triage.webp",
    w: 776,
    h: 880,
    alt: "Triage panel for F-01: Aderyn, Manual and three Slither detectors, affected lines 75 to 78, and the Open, Confirmed, False positive, Duplicate control.",
    lead: "Every detector that agreed.",
    text: "Slither, Aderyn and Luora's own checks on one finding, with a status and a note.",
    span: "md:col-span-2",
    place: "left-1/2 top-6 -translate-x-1/2",
  },
  {
    src: "/landing/b-flow.webp",
    w: 1930,
    h: 790,
    alt: "Flow view rows for deposit, withdraw, harvest and harvestRewards: checks, storage reads, external calls and writes in order, with CEI badges and revert markers.",
    lead: "Flow replay.",
    text: "Each entry point as the exact order of checks, reads, external calls and writes. Reverts and CEI breaks are marked.",
    span: "md:col-span-4",
    place: "left-6 top-6",
  },
  {
    src: "/landing/b-search.webp",
    w: 1200,
    h: 410,
    alt: "Quick search for 'dep' listing ENT-01 deposit(), EVT-01 Deposit and F-01 high: state written after external call in deposit().",
    lead: "⌘K to anything.",
    text: "Jump to an entry point, event or finding by name.",
    span: "md:col-span-2",
    place: "left-6 top-1/2 -translate-y-1/2",
  },
  {
    src: "/landing/b-explorer.webp",
    w: 1920,
    h: 600,
    alt: "Explorer: LuoraVault split into layers (entry points, access gates, internal logic, storage slots, external, events, findings) branching to each function.",
    lead: "Explorer.",
    text: "The contract as layers: entry points, access gates, logic, storage, external calls, events and findings.",
    span: "md:col-span-3",
    place: "left-6 top-1/2 -translate-y-1/2",
  },
  {
    src: "/landing/b-code.webp",
    w: 1272,
    h: 1100,
    alt: "Generated ScenarioNonOwnerCannotSetOracle.t.sol: a forge-std test with setUp deploying the vault and mocks, and the actor alice.",
    lead: "A test you can keep.",
    text: "The Lab writes a forge-std test with setUp, actors and the checks you wired.",
    span: "md:col-span-3",
    place: "left-6 top-6",
  },
];

/** R8 (onorca.dev "Agent-first, end to end") + R11 (mixed-size bento with mini UI) + R12 (bold lead, muted rest). */
export function Bento() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6">
      <Reveal className="mb-12 grid gap-6 md:grid-cols-2 md:items-end">
        <h2 className="font-medium text-[clamp(32px,4.4vw,54px)] text-fg leading-[1.04] tracking-[-0.03em]">
          One console
          <br />
          <span className="text-white/45">for the whole review.</span>
        </h2>
        <p className="max-w-[440px] text-[16px] text-muted leading-relaxed md:justify-self-end">
          Lab, Explorer, Map and Flow share one selection: pick a piece in one
          and the others follow it.
        </p>
      </Reveal>
      <div className="grid gap-3 md:grid-cols-6">
        {CARDS.map((c, i) => (
          <Reveal key={c.src} delay={(i % 3) * 0.08} className={c.span}>
            <article className="group h-full overflow-hidden rounded-[20px] border border-white/[.07] bg-[#0c0c0d] transition-colors hover:border-white/[.14]">
              <div className="dot-grid relative h-[260px] overflow-hidden border-white/[.05] border-b bg-[#0c0c0d] [mask-image:linear-gradient(to_bottom,#000_70%,transparent)] md:h-[300px]">
                <Image
                  src={c.src}
                  alt={c.alt}
                  width={c.w}
                  height={c.h}
                  sizes={`${c.w / 2}px`}
                  style={{ width: c.w / 2, maxWidth: "none" }}
                  className={`absolute rounded-[12px] shadow-float transition-transform duration-700 ease-out group-hover:scale-[1.015] ${c.place}`}
                />
              </div>
              <p className="px-6 py-5 text-[14px] text-dim leading-relaxed">
                <span className="text-fg">{c.lead}</span> {c.text}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
