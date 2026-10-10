/*
 * Hero refs (eighteenth pass: one ref, HA nav kept):
 *  HA https://id.pinterest.com/pin/760404718381966789/ — Triopixels: glass pill nav
 *  HK https://id.pinterest.com/pin/119767671335610696/ — 'The world's richest Memory Library':
 *     a small title + grey subtitle top-left with two dark metric chips (icon · label: value)
 *     under it, a three-line paragraph top-right, and the rest of the screen a chart of thin
 *     vertical hairlines rising from the bottom edge, one bar white with a rotated value label
 *     and a coloured dot above it.
 *  Nineteenth pass ("hapus saja bagian ini, ganti jadi fokus kita yang visualisasi smart contract
 *  dan scenario testing"): HK's header kept, its chart replaced by the Lab itself (HeroLab).
 */
import Link from "next/link";
import { LogoText } from "@/components/ui";
import { ICON_PATH } from "@/features/atlas/utils/icons";
import { contractGraph } from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { HeroExit } from "./Haze";
import { HeroLab } from "./HeroLab";
import { ProductTabs } from "./ProductTabs";
import { ScatterGrow } from "./ScatterGrow";
import { demoAtlas, sampleRun, scenarioDemo, traceFrames } from "./stats";
import "./hero.css";

export const GITHUB = "https://github.com/0xpochita/luora";
export const DOCS = `${GITHUB}#readme`;

type Delay = React.CSSProperties & { "--d"?: string; "--n"?: number };

/**
 * HA pin/760404718381966789 (Triopixels): wordmark left, one glass pill in the middle, a quiet
 * pill right, a hairline under the bar with '+' at its ends. (The active item's dot was dropped.) The glass is a gradient + inner
 * highlight, not backdrop-filter, so scrolling never re-blurs it.
 */
export function Nav() {
  const items = [
    { label: "Product", href: "#product", on: true },
    { label: "How it works", href: "#how-it-works" },
    { label: "Docs", href: DOCS },
    { label: "GitHub", href: GITHUB },
  ];
  return (
    <nav className="lh-up relative z-20 mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-4 md:px-6">
      <Link href="/" className="flex items-center" aria-label="Luora">
        <LogoText height={26} />
      </Link>
      <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/[.08] bg-gradient-to-b from-white/[.07] to-white/[.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_10px_30px_rgba(0,0,0,.45)] md:flex">
        {items.map((i) => (
          <li key={i.label}>
            <a
              href={i.href}
              aria-current={i.on ? "page" : undefined}
              className={`flex items-center rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                i.on
                  ? "bg-white/[.1] text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.1)]"
                  : "text-muted hover:text-fg"
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
      <Link
        href="/trace"
        className="rounded-full bg-primary px-4 py-2 font-medium text-[13px] text-primary-fg transition-colors hover:bg-white"
      >
        Launch app
      </Link>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[.08] to-transparent md:inset-x-6"
      />
      {[0, 1].map((k) => (
        <svg
          key={k}
          aria-hidden="true"
          viewBox="0 0 11 11"
          className={`pointer-events-none absolute -bottom-[5px] hidden size-[11px] text-white/30 md:block ${k ? "right-6 translate-x-1/2" : "left-6 -translate-x-1/2"}`}
          stroke="currentColor"
        >
          <path d="M0 5.5h11M5.5 0v11" />
        </svg>
      ))}
    </nav>
  );
}

const SOLIDITY =
  "M4.409 6.608L7.981.255l3.572 6.353H4.409zM8.411 0l3.569 6.348L15.552 0H8.411zm4.036 17.392l3.572 6.354 3.575-6.354h-7.147zm-.608-10.284h-7.43l3.715 6.605 3.715-6.605zm.428-.25h7.428L15.982.255l-3.715 6.603zM15.589 24l-3.569-6.349L8.448 24h7.141zm-3.856-6.858H4.306l3.712 6.603 3.715-6.603zm.428-.25h7.433l-3.718-6.605-3.715 6.605z";
const ETHEREUM =
  "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z";

const glyph = (d: string) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

/**
 * Nineteenth pass. HK's header (title, subtitle, two chips, one line right) over the Lab window
 * (HeroLab): the app's contract graph and its scenario, the two things Luora is for, the window
 * running off the bottom of the first screen. The graph is cut to the cards that fit the window
 * (graph y < 900), so the page carries only what shows.
 */
export async function Hero() {
  const [atlas, run, scenario] = await Promise.all([
    demoAtlas(),
    sampleRun(),
    scenarioDemo(),
  ]);
  const findings = atlas.pieces.filter((p) => p.sys === "vulns");
  const full = contractGraph(createAtlasModel(atlas));
  const shown = new Set(full.nodes.filter((n) => n.y < 900).map((n) => n.id));
  const contract = {
    nodes: full.nodes.filter((n) => shown.has(n.id)),
    wires: full.wires.filter(
      (w) => shown.has(w.from.node) && shown.has(w.to.node),
    ),
  };
  const tests = run.stats.find((s) => s.label === "forge tests traced")?.value;
  const chips: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: glyph(ICON_PATH.fn), label: "Tests", value: tests ?? "—" },
    {
      icon: <span className="size-1.5 rounded-full bg-red" />,
      label: "Findings",
      value: String(findings.length),
    },
  ];

  return (
    <HeroExit>
      <Nav />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto min-h-[calc(100svh-76px)] max-w-[1240px] px-4 pt-7 md:px-6 md:pt-9"
      >
        {/* HK: title + subtitle + chips left, one line right */}
        <div className="relative z-10 grid gap-5 md:grid-cols-2 md:gap-10">
          <div className="lh-up" style={{ "--d": "0.1s" } as Delay}>
            <h1 className="font-medium text-[clamp(22px,2.1vw,30px)] text-fg leading-tight tracking-[-0.02em]">
              See what your contract actually does.
            </h1>
            <p className="mt-1 text-[clamp(16px,1.5vw,20px)] text-dim leading-tight">
              Contract graphs and scenario tests
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-white/[.08] bg-[#131315] px-2.5 font-mono text-[11.5px] text-muted"
                >
                  {c.icon}
                  {c.label}: <span className="text-fg">{c.value}</span>
                </span>
              ))}
            </div>
          </div>
          <p
            className="lh-up max-w-[440px] text-[15px] text-body leading-relaxed md:justify-self-end md:text-[16px]"
            style={{ "--d": "0.25s" } as Delay}
          >
            Luora draws your contract as a graph of its functions, storage and
            calls, and runs the scenarios you wire on it as Foundry tests.
          </p>
        </div>

        {/* the Lab window, where HK had its chart */}
        <div
          className="lh-up absolute inset-x-4 top-[300px] bottom-0 md:inset-x-6 md:top-[230px]"
          style={{ "--d": "0.35s" } as Delay}
        >
          <HeroLab contract={contract} scenario={scenario} />
        </div>
      </div>
    </HeroExit>
  );
}

/**
 * R3 logo strip: the stack Luora reads its runs from, official marks only (foundry-rs org avatar,
 * simple-icons for Solidity / Ethereum), shown monochrome. Seventh pass: just these three; the
 * analyzers are named where their findings show up (Findings, Compare), not as logos.
 * Genie: these are the row of round icons that scatter before the product grows out of a square in the middle (ScatterGrow.tsx), with the live app tabs (ProductTabs).
 */
export async function Product() {
  const [trace, scenario] = await Promise.all([
    traceFrames(14),
    scenarioDemo(),
  ]);
  const icon = (d: string) => (
    <svg
      viewBox="0 0 24 24"
      className="size-[30px]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
  const marks = [
    {
      title: "Foundry",
      href: "https://getfoundry.sh",
      node: (
        // biome-ignore lint/performance/noImgElement: one tiny static logo, inverted by .lp-mark
        <img src="/logos/tools/foundry.png" alt="" className="size-[40px]" />
      ),
    },
    {
      title: "Solidity",
      href: "https://soliditylang.org",
      node: icon(SOLIDITY),
    },
    { title: "Ethereum", href: "https://ethereum.org", node: icon(ETHEREUM) },
  ];
  return (
    <ScatterGrow marks={marks}>
      <ProductTabs frames={trace.frames} scenario={scenario} />
    </ScatterGrow>
  );
}
