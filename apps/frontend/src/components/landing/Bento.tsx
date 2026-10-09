import Image from "next/image";
import Link from "next/link";
import { BentoMini, type MiniKind } from "./BentoMini";
import { Reveal } from "./motion";
import { demoAtlas } from "./stats";

type Card = {
  src: string;
  w: number;
  h: number;
  alt: string;
  lead: string;
  text: string;
  span: string;
  /** the app view the card opens */
  href: string;
  /** drawn live from the sample run instead of the capture (the capture had to be cropped) */
  live?: MiniKind;
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
    href: "/atlas",
    live: "source",
  },
  {
    src: "/landing/b-graph.webp",
    w: 940,
    h: 730,
    alt: "Call graph of test_depositThenWithdraw: MockOracle.getPrice, MockUSDC.transferFrom and the Transfer and Deposit events as nodes with decoded values and gas.",
    lead: "Call graph.",
    text: "One node per frame, with decoded args, return values and gas.",
    span: "md:col-span-2",
    href: "/trace",
  },
  {
    src: "/landing/b-triage.webp",
    w: 776,
    h: 880,
    alt: "Triage panel for F-01: Aderyn, Manual and three Slither detectors, affected lines 75 to 78, and the Open, Confirmed, False positive, Duplicate control.",
    lead: "Every detector that agreed.",
    text: "Slither, Aderyn and Luora's own checks on one finding, with a status and a note.",
    span: "md:col-span-2",
    href: "/atlas",
  },
  {
    src: "/landing/b-flow.webp",
    w: 1930,
    h: 790,
    alt: "Flow view rows for deposit, withdraw, harvest and harvestRewards: checks, storage reads, external calls and writes in order, with CEI badges and revert markers.",
    lead: "Flow replay.",
    text: "Each entry point as the exact order of checks, reads, external calls and writes. Reverts and CEI breaks are marked.",
    span: "md:col-span-4",
    href: "/atlas",
    live: "flow",
  },
  {
    src: "/landing/b-search.webp",
    w: 1200,
    h: 410,
    alt: "Quick search for 'dep' listing ENT-01 deposit(), EVT-01 Deposit and F-01 high: state written after external call in deposit().",
    lead: "⌘K to anything.",
    text: "Jump to an entry point, event or finding by name.",
    span: "md:col-span-2",
    href: "/atlas",
    live: "search",
  },
  {
    src: "/landing/b-explorer.webp",
    w: 1920,
    h: 600,
    alt: "Explorer: LuoraVault split into layers (entry points, access gates, internal logic, storage slots, external, events, findings) branching to each function.",
    lead: "Explorer.",
    text: "The contract as layers: entry points, access gates, logic, storage, external calls, events and findings.",
    span: "md:col-span-3",
    href: "/atlas",
  },
  {
    src: "/landing/b-code.webp",
    w: 1272,
    h: 1100,
    alt: "Generated ScenarioNonOwnerCannotSetOracle.t.sol: a forge-std test with setUp deploying the vault and mocks, and the actor alice.",
    lead: "A test you can keep.",
    text: "The Lab writes a forge-std test with setUp, actors and the checks you wired.",
    span: "md:col-span-3",
    href: "/atlas",
  },
];

/**
 * R8 (onorca.dev "Agent-first, end to end") + R11 (mixed-size bento) + R12 (bold lead, muted rest).
 * Seventh pass, every card the same anatomy so nothing is cut off:
 *  P3 pin/4362930885208241 (Deerflow AIoT dashboard): equal-height tiles, a small '01  Title' row
 *     on top, the instrument centred in the tile with room around it.
 *  P2 pin/523191681737169397 (Lore "01 Write / 02 Generate / 03 Share"): the mini UI sits whole
 *     inside a nested inner card, a two-line caption under it.
 *  P5 pin/30047522509933052 ("Code / Design / Writing / Building"): one composed monochrome object
 *     per tile on a dark field, nothing bleeding off the edges.
 *  Genie "There's more" bento (geniestudio.app): each card a link, lifting on hover; here the
 *     cards rise from a slight tilt in a scrubbed stagger (Reveal tilt) instead of popping in.
 * The captures are the real app (public/landing/b-*.webp), fitted whole with object-contain;
 * Source, Flow and Quick search are drawn live from the sample run instead (BentoMini.tsx).
 */
export async function Bento() {
  const atlas = await demoAtlas();
  return (
    <section
      data-tone="bento"
      className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6"
    >
      <Reveal className="mb-14 grid gap-6 md:grid-cols-2 md:items-end">
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
      <div className="grid gap-4 md:grid-cols-6">
        {CARDS.map((c, i) => (
          <Reveal key={c.src} delay={(i % 3) * 0.06} tilt className={c.span}>
            <Link href={c.href} className="lp-bento group">
              <p className="flex items-baseline gap-3 px-5 pt-5 pb-4">
                <span className="font-mono text-[12.5px] text-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] text-fg">
                  {c.lead.replace(/\.$/, "")}
                </span>
                <span
                  aria-hidden="true"
                  className="ml-auto text-dim transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-fg"
                >
                  →
                </span>
              </p>
              <div className="dot-grid mx-2 flex h-[230px] items-center justify-center overflow-hidden rounded-inner border border-white/[.05] bg-inner-grad p-6 md:h-[260px]">
                {c.live ? (
                  <BentoMini atlas={atlas} kind={c.live} />
                ) : (
                  <Image
                    src={c.src}
                    alt={c.alt}
                    width={c.w}
                    height={c.h}
                    sizes={`${c.w / 2}px`}
                    className="h-auto max-h-full w-auto max-w-full rounded-[10px] shadow-float transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  />
                )}
              </div>
              <p className="px-5 pt-4 pb-5 text-[13.5px] text-dim leading-relaxed">
                {c.text}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
