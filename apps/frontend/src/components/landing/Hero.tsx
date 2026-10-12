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
import Image from "next/image";
import Link from "next/link";
import { ChainLogo, LogoText, PH, PhIcon, SOLIDITY } from "@/components/ui";
import { contractGraph } from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { GitHubMark } from "./GitHubMark";
import { HeroExit } from "./Haze";
import { HeroLab } from "./HeroLab";
import { ProductTabs } from "./ProductTabs";
import { ScatterGrow } from "./ScatterGrow";
import { demoAtlas, scenarioDemo, traceFrames } from "./stats";
import { XMark } from "./XMark";
import "@/components/(main)/shell/header.css";
import "./hero.css";

export const GITHUB = "https://github.com/0xpochita/luora";
export const DOCS = "/docs";

type Delay = React.CSSProperties & { "--d"?: string; "--n"?: number };

/**
 * HA pin/760404718381966789 (Triopixels): wordmark left, one glass pill in the middle, a quiet
 * pill right, a hairline under the bar with '+' at its ends. (The active item's dot was dropped.) The glass is a gradient + inner
 * highlight, not backdrop-filter, so scrolling never re-blurs it.
 */
export function Nav({ active = "product" }: { active?: "product" | "docs" }) {
  // the landing's sections by anchor; from another page (Docs) they go back to the landing
  const home = active === "product" ? "" : "/";
  const items = [
    { label: "Product", href: `${home}#product`, on: active === "product" },
    { label: "How it works", href: `${home}#how-it-works` },
    { label: "Docs", href: DOCS, on: active === "docs" },
    { label: "GitHub", href: GITHUB, mark: true },
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
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                i.on
                  ? "bg-white/[.1] text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.1)]"
                  : "text-muted hover:text-fg"
              }`}
            >
              {i.mark && <GitHubMark className="size-3.5" />}
              {i.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        {/* on the docs, where to follow the project sits by the call to action (onorca.dev/docs:
            the social marks left of Download) */}
        {active === "docs" && (
          <a
            href="https://x.com/luorasec"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Luora on X"
            title="Follow @luorasec on X"
            className="grid size-9 place-items-center rounded-full border border-white/[.08] text-muted transition-colors hover:border-white/[.16] hover:text-fg"
          >
            <XMark className="size-3.5" />
          </a>
        )}
        {/* the app header's Connect AI capsule (header.css .hdr-pill.lit): the Luora starburst
            where it has its sparkle, a caret pointing on */}
        <Link href="/trace" className="group hdr-pill lit">
          <svg
            aria-hidden="true"
            viewBox="-40 -40 80 80"
            className="size-[15px] flex-none transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110 motion-reduce:transition-none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          >
            <path d="M0-9V-34M0 9V34M-9 0H-34M9 0H34" />
            <path d="M8-8L21-21M-8 8L-21 21M-8-8L-21-21M8 8L21 21" />
          </svg>
          Launch app
          <PhIcon d={PH.caretRight} className="size-3 text-dim" />
        </Link>
      </div>
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

const ETHEREUM =
  "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z";

/** the chains whose testnets the exporter forks, in the order the app lists them */
const CHAINS = [
  ["ethereum", "Ethereum", "https://ethereum.org"],
  ["arbitrum", "Arbitrum", "https://arbitrum.io"],
  ["base", "Base", "https://www.base.org"],
  ["robinhood", "Robinhood Chain", "https://robinhood.com/us/en/crypto/chain/"],
  ["hyperliquid", "Hyperliquid", "https://hyperliquid.xyz"],
  ["tempo", "Tempo", "https://tempo.xyz"],
] as const;
/** every mark in the hero opens its project's own site in a new tab */
const OUT = { target: "_blank", rel: "noopener noreferrer" } as const;

/** the tools Luora reads from: forge's runs, the Solidity source, Slither's and Aderyn's reports */
const tool = (src: string) => (
  <Image
    src={src}
    alt=""
    width={36}
    height={36}
    className="size-full object-contain"
  />
);
const TOOLS = [
  ["Foundry", "https://getfoundry.sh", tool("/logos/tools/foundry.png")],
  [
    "Solidity",
    "https://soliditylang.org",
    <svg
      key="sol"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="#363636"
      className="size-full"
    >
      <path d={SOLIDITY} />
    </svg>,
  ],
  [
    "Slither",
    "https://github.com/crytic/slither",
    tool("/logos/tools/slither-mark.png"),
  ],
  [
    "Aderyn",
    "https://github.com/Cyfrin/aderyn",
    tool("/logos/tools/aderyn-mark.png"),
  ],
] as const;

/**
 * Nineteenth pass. HK's header (title, subtitle, a chip, one line right) over the Lab window
 * (HeroLab): the app's contract graph and its scenario, the two things Luora is for, the window
 * running off the bottom of the first screen. The graph is cut to the cards that fit the window
 * (graph y < 900), so the page carries only what shows.
 */
export async function Hero() {
  const [atlas, scenario] = await Promise.all([demoAtlas(), scenarioDemo()]);
  const full = contractGraph(createAtlasModel(atlas));
  const shown = new Set(full.nodes.filter((n) => n.y < 900).map((n) => n.id));
  const contract = {
    nodes: full.nodes.filter((n) => shown.has(n.id)),
    wires: full.wires.filter(
      (w) => shown.has(w.from.node) && shown.has(w.to.node),
    ),
  };
  return (
    <HeroExit>
      <Nav />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto min-h-[calc(100svh-76px)] max-w-[1240px] px-4 pt-7 md:px-6 md:pt-9"
      >
        {/* One reading column, left (HB pin/60376451250059963, Instafleet: an eyebrow over the
            title and its muted line, the right side left empty for the product below). The two
            provenance chips ride above the title as its eyebrow (HA2 pin/470626229833453751, Atom
            AI; HC pin/986358755907499973, Basecom: one pill over the headline); the chains and
            the tools, both "what Luora stands on", share one strip under it, split by a hairline
            (HC: the logos as one strip), instead of two text blocks pulling left and right. */}
        <div className="lh-up relative z-10" style={{ "--d": "0.1s" } as Delay}>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://colosseum.com/arena/projects/luora"
              {...OUT}
              className="inline-flex h-9 items-center gap-2.5 rounded-[8px] border border-white/[.08] bg-[#131315] pr-3.5 pl-1.5 font-mono text-[13.5px] text-muted transition-colors hover:border-white/[.16]"
            >
              <Image
                src="/logos/colloseum.jpg"
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-[5px]"
              />
              Built in <span className="text-fg">Colosseum</span>
            </a>
            <a
              href={GITHUB}
              {...OUT}
              className="inline-flex h-9 items-center gap-2.5 rounded-[8px] border border-white/[.08] bg-[#131315] pr-3.5 pl-1.5 font-mono text-[13.5px] text-muted transition-colors hover:border-white/[.16]"
            >
              <span className="grid size-6 place-items-center rounded-[5px] bg-white text-black">
                <GitHubMark className="size-4" />
              </span>
              Open source on <span className="text-fg">GitHub</span>
            </a>
          </div>
          <h1 className="mt-5 font-medium text-[clamp(22px,2.1vw,30px)] text-fg leading-tight tracking-[-0.02em]">
            See what your contract actually does.
          </h1>
          <p className="mt-1 text-[clamp(16px,1.5vw,20px)] text-dim leading-tight">
            Contract graphs and scenario tests
          </p>
          {/* the chains whose testnets the exporter forks (luora-export.mjs --forks), then the
              tools whose output Luora reads, on white tiles as they ship them */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[13px] text-dim">
            <p className="flex items-center gap-3">
              Powered by
              <span className="flex items-center gap-2">
                {CHAINS.map(([family, name, href]) => (
                  <a
                    key={family}
                    href={href}
                    {...OUT}
                    title={name}
                    aria-label={name}
                    className="transition-transform hover:-translate-y-0.5"
                  >
                    <ChainLogo family={family} className="size-6" />
                  </a>
                ))}
              </span>
            </p>
            <span
              aria-hidden="true"
              className="hidden h-5 w-px bg-white/[.12] sm:block"
            />
            <p className="flex items-center gap-3">
              Works with
              <span className="flex items-center gap-2">
                {TOOLS.map(([name, href, mark]) => (
                  <a
                    key={name}
                    href={href}
                    {...OUT}
                    title={name}
                    aria-label={name}
                    className="grid size-6 place-items-center rounded-[5px] bg-white p-[3px] ring-1 ring-white/15 transition-transform hover:-translate-y-0.5"
                  >
                    {mark}
                  </a>
                ))}
              </span>
            </p>
          </div>
        </div>

        {/* the Lab window, where HK had its chart; on phones it follows the stacked header in the
            flow (their height depends on the width), from md it sits under the two-column header */}
        <div
          className="lh-up relative mt-9 h-[440px] md:absolute md:inset-x-6 md:top-[250px] md:bottom-0 md:mt-0 md:h-auto"
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
    {
      // any EVM chain, not just L1 (the fork picker runs Ethereum, Arbitrum, Base, Robinhood,
      // HyperEVM and Tempo testnets); the diamond stays as the EVM's own mark
      title: "EVM Chain",
      href: "https://ethereum.org/developers/docs/evm/",
      node: icon(ETHEREUM),
    },
  ];
  return (
    <ScatterGrow marks={marks}>
      <ProductTabs frames={trace.frames} scenario={scenario} />
    </ScatterGrow>
  );
}
