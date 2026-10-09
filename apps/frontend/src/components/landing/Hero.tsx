/*
 * Hero refs (fourteenth pass: HE restaged the hero as a pipeline; HA nav and HC lit mark kept):
 *  HA https://id.pinterest.com/pin/760404718381966789/ — Triopixels: glass pill nav, one shaft of light
 *  HB https://id.pinterest.com/pin/1125968725514399/ — Huly: the beam lands on the product's top edge
 *  HC https://id.pinterest.com/pin/4081455908271646/ — Ascend: one big monochrome lit object
 *  HD https://id.pinterest.com/pin/3307399722549125/ — Lumina: the mark wired to its pieces
 *  HE https://id.pinterest.com/pin/1095148834406977968/ — Prophet: glow + CTA, sources → card → lit tile → triage stacks
 */
import Link from "next/link";
import { LogoText } from "@/components/ui";
import { ICON_PATH } from "@/features/atlas/utils/icons";
import { GitHubMark } from "./GitHubMark";
import { HeroExit } from "./Haze";
import { ProductTabs } from "./ProductTabs";
import { ScatterGrow } from "./ScatterGrow";
import { scenarioDemo, traceFrames } from "./stats";
import "./hero.css";

export const GITHUB = "https://github.com/0xpochita/luora";
export const DOCS = `${GITHUB}#readme`;

type Delay = React.CSSProperties & { "--d"?: string; "--n"?: number };

/**
 * HA pin/760404718381966789 (Triopixels): wordmark left, one glass pill in the middle, a quiet
 * pill right, a hairline under the bar with '+' at its ends. The glass is a gradient + inner
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
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                i.on
                  ? "bg-white/[.1] text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.1)]"
                  : "text-muted hover:text-fg"
              }`}
            >
              {i.on && <span className="size-1 rounded-full bg-white" />}
              {i.label}
            </a>
          </li>
        ))}
      </ul>
      <Link
        href="/trace"
        className="rounded-full bg-primary px-4 py-2 font-medium text-[13px] text-primary-fg transition-colors hover:bg-white"
      >
        Open app
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

/**
 * The brand mark redrawn from public/brand/mark-tile.png: starburst, centre square, and the long
 * NE ray ending in the flagged square. viewBox is shifted so the centre square sits at its centre.
 * Lit from above (HC): white at the top fading to graphite at the foot.
 */
function Mark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="-12 7 512 512" className={className}>
      <defs>
        <linearGradient
          id="lh-lit"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="84"
          x2="0"
          y2="434"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#8a8a90" />
        </linearGradient>
      </defs>
      <g stroke="url(#lh-lit)" strokeWidth="30" fill="none">
        <path d="M244 124V205M244 322V434M60 263H180M306 263H425M150 178L196 224M146 352L196 302M293 302L345 354M291 213L370 136" />
      </g>
      <g fill="url(#lh-lit)">
        <rect x="219" y="238" width="50" height="50" />
        <rect className="lh-flag" x="382" y="84" width="42" height="42" />
      </g>
    </svg>
  );
}

/** simple-icons paths (CC0) for the two marks that ship as SVG */
const SOLIDITY =
  "M4.409 6.608L7.981.255l3.572 6.353H4.409zM8.411 0l3.569 6.348L15.552 0H8.411zm4.036 17.392l3.572 6.354 3.575-6.354h-7.147zm-.608-10.284h-7.43l3.715 6.605 3.715-6.605zm.428-.25h7.428L15.982.255l-3.715 6.603zM15.589 24l-3.569-6.349L8.448 24h7.141zm-3.856-6.858H4.306l3.712 6.603 3.715-6.603zm.428-.25h7.433l-3.718-6.605-3.715 6.605z";
const ETHEREUM =
  "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z";

const glyph = (d: string, cls = "size-[18px]") => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={cls}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);
const solid = (d: string) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-[18px]"
    fill="currentColor"
  >
    <path d={d} />
  </svg>
);

/**
 * HE pin/1095148834406977968 (Prophet, AI SOC platform): under the CTA, one pipeline reads left to
 * right: a grid of source tiles bracketed into one input card, into the brand's lit tile, then a
 * fork into a highlighted 'true positive' stack and a faded 'false positive' stack.
 * Here: what Luora reads (Foundry, Solidity, Ethereum, the forge -vvvv trace, forge coverage, the
 * analyzer reports) → the one file the export writes (its real output line) → Luora → triage:
 * the sample's first high finding confirmed, the rest of the noise dismissed as false positives.
 */
const TILES: { label: string; node: React.ReactNode }[] = [
  {
    label: "Foundry",
    node: (
      // biome-ignore lint/performance/noImgElement: 18px static logo
      <img
        src="/logos/tools/foundry.png"
        alt=""
        className="size-[18px] invert"
      />
    ),
  },
  { label: "Solidity", node: solid(SOLIDITY) },
  { label: "Ethereum", node: solid(ETHEREUM) },
  { label: "forge test -vvvv", node: glyph("M4 17l6-5-6-5M12 19h8") },
  { label: "forge coverage", node: glyph(ICON_PATH.grid) },
  { label: "Slither · Aderyn reports", node: glyph(ICON_PATH.warn) },
];
const T = 44; // tile size
const TX = [0, 54, 108];
const TY = [102, 154];

function Pipeline({ log }: { log: string[] }) {
  const out =
    log.find((l) => l.includes("luora-data")) ?? log[log.length - 1] ?? "";
  const wire =
    "M156 124H172Q178 124 178 130V170Q178 176 172 176H156M178 150H200M440 150H500M620 150H690Q700 150 700 140V110Q700 100 710 100H740M700 160V200Q700 210 710 210H740";
  return (
    <div
      className="lh-up relative mt-16 w-full"
      style={{ "--d": "1.2s" } as Delay}
    >
      {/* desktop: the pipeline at 1:1 in a 960×260 box */}
      <div className="relative mx-auto hidden h-[260px] w-[960px] md:block">
        <svg
          aria-hidden="true"
          data-smil
          viewBox="0 0 960 260"
          className="lh-wires absolute inset-0 size-full"
          fill="none"
        >
          <path d={wire} stroke="#fff" strokeOpacity="0.2" />
          <path
            d="M700 160V200Q700 210 710 210H740"
            stroke="#fff"
            strokeOpacity="0.1"
          />
          <circle r="2.5" fill="#fff" opacity="0" className="lh-packet">
            <animate
              attributeName="opacity"
              dur="4.2s"
              begin="2.4s"
              repeatCount="indefinite"
              values="0;1;1;0"
              keyTimes="0;0.08;0.9;1"
            />
            <animateMotion
              dur="4.2s"
              begin="2.4s"
              repeatCount="indefinite"
              path="M178 150H500M620 150H690Q700 150 700 140V110Q700 100 710 100H740"
              calcMode="spline"
              keyPoints="0;1"
              keyTimes="0;1"
              keySplines="0.4 0 0.6 1"
            />
          </circle>
        </svg>

        {/* sources */}
        {TILES.map((t, i) => (
          <span
            key={t.label}
            title={t.label}
            className="lh-node absolute grid place-items-center rounded-[12px] border border-white/[.09] bg-gradient-to-b from-[#1b1b1e] to-[#111113] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
            style={
              {
                left: TX[i % 3],
                top: TY[Math.floor(i / 3)],
                width: T,
                height: T,
                "--d": `${1.4 + i * 0.05}s`,
              } as Delay
            }
          >
            {t.node}
          </span>
        ))}

        {/* the export's one file */}
        <div
          className="lh-node absolute top-[125px] left-[200px] flex h-[50px] w-[240px] items-center gap-3 rounded-[14px] border border-white/[.12] bg-gradient-to-b from-[#1d1d20] to-[#121214] px-2.5 text-left shadow-float"
          style={{ "--d": "1.7s" } as Delay}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-white text-[#0b0b0c]">
            {glyph("M14 3v5h5M6 3h8l5 5v13H6z", "size-4")}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-[12.5px] text-fg">
              luora-data.json
            </span>
            <span className="truncate text-[11px] text-dim" title={out}>
              {out.replace(/^luora: /, "").replace(/ → luora-data\.json$/, "")}
            </span>
          </span>
        </div>

        {/* HE: the brand's lit tile in the middle of the pipeline */}
        <div className="lh-core absolute top-[90px] left-[500px] size-[120px] rounded-[28px] border border-white/[.18] bg-gradient-to-b from-[#2a2a2e] to-[#121214] shadow-[0_0_60px_rgba(255,255,255,.12),inset_0_1px_0_rgba(255,255,255,.18)]">
          <Mark className="lh-mark absolute inset-[22px]" />
        </div>

        {/* triage: the first high confirmed, the noise dismissed */}
        <p
          className="lh-node absolute top-[34px] left-[740px] flex items-center gap-2 text-[11.5px] text-muted"
          style={{ "--d": "2.1s" } as Delay}
        >
          <span className="grid size-3.5 place-items-center rounded-[4px] bg-white text-[#0b0b0c]">
            {glyph(ICON_PATH.check, "size-2.5")}
          </span>
          Pin it with a Foundry test
        </p>
        <div
          className="lh-node absolute top-[80px] left-[740px] w-[220px]"
          style={{ "--d": "2s" } as Delay}
        >
          {[2, 1, 0].map((k) => (
            <span
              key={k}
              className={`absolute inset-x-0 flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[12.5px] ${
                k
                  ? "border-red/20 bg-[#1a1112] text-red/40"
                  : "border-red/45 bg-[#221415] text-red shadow-[0_0_24px_rgba(248,113,113,.18)]"
              }`}
              style={{
                top: k * 7,
                transform: `scale(${1 - k * 0.04})`,
                zIndex: 3 - k,
              }}
            >
              ▲ <span className="font-mono">H-01</span> · Confirmed
            </span>
          ))}
        </div>
        <div
          className="lh-node absolute top-[190px] left-[740px] w-[220px]"
          style={{ "--d": "2.15s" } as Delay}
        >
          {[4, 3, 2, 1, 0].map((k) => (
            <span
              key={k}
              className="absolute inset-x-0 flex h-9 items-center rounded-[10px] border border-white/[.07] bg-[#111113] px-3 text-[12.5px] text-dim"
              style={{
                top: k * 7,
                opacity: 1 - k * 0.18,
                transform: `scale(${1 - k * 0.03})`,
                zIndex: 5 - k,
              }}
            >
              False positive
            </span>
          ))}
        </div>
      </div>

      {/* phones: the same pipeline, top to bottom */}
      <div className="mx-auto flex max-w-[340px] flex-col items-center gap-3 md:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          {TILES.map((t) => (
            <span
              key={t.label}
              title={t.label}
              className="grid size-9 place-items-center rounded-[10px] border border-white/[.09] bg-[#151517] text-white/70"
            >
              {t.node}
            </span>
          ))}
        </div>
        <span className="h-5 w-px bg-white/20" />
        <span className="rounded-[12px] border border-white/[.12] bg-[#17171a] px-3 py-2 font-mono text-[12px] text-fg">
          luora-data.json
        </span>
        <span className="h-5 w-px bg-white/20" />
        <span className="relative size-20 rounded-[20px] border border-white/[.18] bg-gradient-to-b from-[#2a2a2e] to-[#121214] shadow-[0_0_40px_rgba(255,255,255,.1)]">
          <Mark className="absolute inset-[14px]" />
        </span>
        <span className="h-5 w-px bg-white/20" />
        <div className="flex gap-2 text-[12px]">
          <span className="rounded-[10px] border border-red/45 bg-[#221415] px-3 py-2 text-red">
            ▲ H-01 · Confirmed
          </span>
          <span className="rounded-[10px] border border-white/[.07] bg-[#111113] px-3 py-2 text-dim">
            False positive
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Fourteenth pass (HE Prophet): glow → eyebrow → headline lines rise → CTA → the pipeline under it
 * (sources → luora-data.json → Luora → triage) draws left to right. The hairline under it hands
 * over to the Works-with hub below (HD).
 */
export function Hero({ log }: { log: string[] }) {
  return (
    <HeroExit>
      <Nav />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center px-4 pt-16 pb-32 text-center md:pt-24 md:pb-44"
      >
        {/* HE: a soft light pooled over a fine dot field behind the headline (no beam) */}
        <div
          aria-hidden="true"
          className="lh-glow pointer-events-none absolute top-[-76px] left-1/2 h-[560px] w-[1200px] -translate-x-1/2"
        />
        <a
          href="#product"
          className="lh-up inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.04] py-1 pr-3 pl-1.5 text-[12.5px] text-muted transition-colors hover:text-fg md:mt-5"
          style={{ "--d": "0.6s" } as Delay}
        >
          <span className="rounded-full bg-white/[.08] px-2 py-0.5 font-mono text-[11.5px] text-text">
            forge test -vvvv
          </span>
          Reads your local Foundry runs
        </a>
        <h1 className="mt-5 max-w-[920px] font-light text-[clamp(40px,6.4vw,84px)] text-fg leading-[1.02] tracking-[-0.035em]">
          <span className="lh-line">
            <span style={{ "--d": "0.7s" } as Delay}>
              See what your contract
            </span>
          </span>
          <span className="lh-line text-white/45">
            <span style={{ "--d": "0.84s" } as Delay}>actually does.</span>
          </span>
        </h1>
        <p className="mt-6 max-w-[520px] text-[16px] text-body leading-relaxed md:text-[17px]">
          Decoded traces, a contract graph you can write tests on, and analyzer
          findings you can triage. All from code you are reviewing.
        </p>
        <div
          className="lh-up mt-7 flex flex-wrap items-center justify-center gap-3"
          style={{ "--d": "1.05s" } as Delay}
        >
          <Link
            href="/atlas"
            className="rounded-full bg-primary px-5 py-2.5 font-medium text-[14px] text-primary-fg shadow-[0_0_32px_rgba(255,255,255,.22)] transition-[background-color,box-shadow] hover:bg-white hover:shadow-[0_0_44px_rgba(255,255,255,.32)]"
          >
            Open the Lab
          </Link>
          <a
            href={GITHUB}
            className="inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-raised px-5 py-2.5 text-[14px] text-fg transition-colors hover:bg-hover"
          >
            <GitHubMark />
            View on GitHub
          </a>
        </div>

        <Pipeline log={log} />
        <div
          aria-hidden="true"
          className="lh-up h-24 w-px bg-gradient-to-b from-white/25 to-transparent"
          style={{ "--d": "2.2s" } as Delay}
        />
      </div>

      {/* R1: vertical scroll label on the right edge, a tick running down its line */}
      <a
        href="#product"
        className="lh-up absolute top-[440px] right-5 z-10 hidden items-center gap-3 text-[12px] text-dim [writing-mode:vertical-rl] hover:text-muted xl:flex"
        style={{ "--d": "2s" } as Delay}
      >
        Scroll to explore
        <span className="relative h-12 w-px overflow-hidden bg-white/15">
          <span className="lh-tick absolute inset-x-0 top-0 h-1/4 bg-white/70" />
        </span>
      </a>
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
