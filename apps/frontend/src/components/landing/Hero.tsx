/*
 * Hero refs (thirteenth pass, see index.ts):
 *  HA https://id.pinterest.com/pin/760404718381966789/ — Triopixels: glass pill nav, one shaft of light
 *  HB https://id.pinterest.com/pin/1125968725514399/ — Huly: the beam lands on the product's top edge
 *  HC https://id.pinterest.com/pin/4081455908271646/ — Ascend: one big monochrome lit object
 *  HD https://id.pinterest.com/pin/3307399722549125/ — Lumina: the mark wired to its pieces
 */
import Link from "next/link";
import { LogoText } from "@/components/ui";
import { ICON_PATH, type IconKey } from "@/features/atlas/utils/icons";
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

/**
 * HA/HC: hairline perspective lines meeting at the mark, '+' markers on them. Faded by a radial
 * gradient stroke rather than a mask (no offscreen mask layer to raster at load).
 */
function Backdrop() {
  const vx = 800;
  const vy = 100;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 1000"
      className="pointer-events-none absolute top-1/2 left-1/2 h-[1000px] w-[1600px] max-w-none -translate-x-1/2 -translate-y-[100px]"
    >
      <defs>
        <radialGradient
          id="lh-fade"
          gradientUnits="userSpaceOnUse"
          cx={vx}
          cy={vy}
          r="900"
        >
          <stop offset="0.08" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.035" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        stroke="url(#lh-fade)"
        fill="none"
        d={[-1200, -600, -270, 270, 600, 1200]
          .map((dx) => `M${vx} ${vy}L${vx + dx} 1000`)
          .concat(
            `M${vx} ${vy}L${vx - 1100} -1000M${vx} ${vy}L${vx + 1100} -1000`,
          )
          .join("")}
      />
      <path
        stroke="#fff"
        strokeOpacity="0.22"
        d={[
          [587, 420],
          [1013, 420],
          [133, 600],
          [1467, 600],
        ]
          .map(([x, y]) => `M${x - 5} ${y}h10M${x} ${y - 5}v10`)
          .join("")}
      />
    </svg>
  );
}

type GraphNode = {
  icon: IconKey;
  label: string;
  sub: string;
  x: number;
  y: number;
  /** wire from the mark's ray (or its flagged square) out to the node */
  d: string;
  side: "l" | "r";
  bad?: boolean;
};

/**
 * HD Lumina (the mark wired to its pieces) + the sample vault's real pieces, in a 1240×200 box
 * with the mark at (620, 100): deposit() writes slot 5 (totalShares, forge inspect), prices
 * through IOracle.getPrice(), and Slither's unchecked-transfer sits on it (the first high, H-01).
 * The finding hangs off the mark's own flagged square.
 */
const NODES: GraphNode[] = [
  {
    icon: "fn",
    label: "deposit()",
    sub: "entry · anyone",
    x: 400,
    y: 44,
    d: "M594 76C548 44 480 44 416 44",
    side: "l",
  },
  {
    icon: "cylinder",
    label: "slot 5 · totalShares",
    sub: "written by deposit",
    x: 230,
    y: 150,
    d: "M572 100C470 100 420 150 246 150",
    side: "l",
  },
  {
    icon: "warn",
    label: "▲ H-01 · high",
    sub: "unchecked transfer",
    x: 840,
    y: 44,
    d: "M664 62C716 44 760 44 824 44",
    side: "r",
    bad: true,
  },
  {
    icon: "eye",
    label: "IOracle",
    sub: "getPrice()",
    x: 1010,
    y: 150,
    d: "M668 100C770 100 820 150 994 150",
    side: "r",
  },
];

function Graph() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 hidden h-[200px] w-[1240px] -translate-x-1/2 -translate-y-1/2 xl:block"
    >
      <svg
        aria-hidden="true"
        data-smil
        viewBox="0 0 1240 200"
        className="lh-wires absolute inset-0 size-full"
        fill="none"
      >
        {NODES.map((n) => (
          <path
            key={n.label}
            d={n.d}
            stroke={n.bad ? "var(--red)" : "#fff"}
            strokeOpacity={n.bad ? 0.7 : 0.22}
          />
        ))}
        {NODES.map((n, i) => (
          <circle
            key={`p-${n.label}`}
            r="2.5"
            fill={n.bad ? "var(--red)" : "#fff"}
            opacity="0"
            className="lh-packet"
          >
            <animate
              attributeName="opacity"
              dur="3.6s"
              begin={`${2.4 + i * 0.9}s`}
              repeatCount="indefinite"
              values="0;1;1;0"
              keyTimes="0;0.1;0.85;1"
            />
            <animateMotion
              dur="3.6s"
              begin={`${2.4 + i * 0.9}s`}
              repeatCount="indefinite"
              path={n.d}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1"
            />
          </circle>
        ))}
      </svg>
      {NODES.map((n, i) => (
        <div
          key={n.label}
          className={`lh-node absolute flex -translate-y-1/2 items-center gap-3 whitespace-nowrap ${
            n.side === "l"
              ? "-translate-x-full flex-row-reverse text-right"
              : ""
          }`}
          style={
            {
              left: n.side === "l" ? n.x + 16 : n.x - 16,
              top: n.y,
              "--d": `${1.7 + i * 0.12}s`,
            } as Delay
          }
        >
          <span
            className={`grid size-8 place-items-center rounded-full border bg-[#0b0b0c] ${
              n.bad ? "border-red/40 text-red" : "border-white/15 text-muted"
            }`}
          >
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
              <path d={ICON_PATH[n.icon]} />
            </svg>
          </span>
          <span className="flex flex-col">
            <span
              className={`font-mono text-[12.5px] ${n.bad ? "text-red" : "text-text"}`}
            >
              {n.label}
            </span>
            <span className="text-[12px] text-dim">{n.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The focal band: beam (HA/HB) landing on the lit mark (HC), its halo, the perspective hairlines
 * meeting there and the contract graph wired out of its rays (HD).
 */
function Focus() {
  return (
    <div className="relative h-[120px] w-full md:h-[184px]">
      <Backdrop />
      <div
        aria-hidden="true"
        className="lh-beam-wrap pointer-events-none absolute bottom-[calc(50%-90px)] left-1/2 h-[600px] w-[420px] -ml-[210px]"
      >
        <div className="lh-beam absolute inset-0" />
        <div className="lh-beam-core absolute top-0 bottom-[90px] left-1/2 -ml-px w-0.5" />
      </div>
      <div
        aria-hidden="true"
        className="lh-halo pointer-events-none absolute top-1/2 left-1/2 -mt-[160px] -ml-[160px] size-[320px]"
      />
      <Graph />
      <Mark className="lh-mark absolute top-1/2 left-1/2 -mt-9 -ml-9 size-[72px] md:-mt-14 md:-ml-14 md:size-[112px]" />
    </div>
  );
}

/** R8 (onorca.dev shows the real agent output): what `node luora-export.mjs` printed for the sample vault. */
function Terminal({ log }: { log: string[] }) {
  const lines = ["$ node luora-export.mjs", ...log];
  let d = 1.95;
  return (
    <div
      className="lh-up relative mt-11 w-full max-w-[600px]"
      style={{ "--d": "1.4s" } as Delay}
    >
      {/* HB Huly / HD Lumina: the light lands as a horizon on the terminal's top edge */}
      <div
        aria-hidden="true"
        className="lh-horizon-glow pointer-events-none absolute -inset-x-[20%] bottom-full h-28"
      />
      <div
        aria-hidden="true"
        className="lh-horizon pointer-events-none absolute -inset-x-[30%] top-0 z-10 h-px"
      />
      <div className="overflow-hidden rounded-[14px] border border-white/[.08] bg-gradient-to-b from-[#141416] to-[#0a0a0b] text-left shadow-float">
        <div className="flex items-center gap-1.5 px-3.5 py-2.5">
          {[0, 1, 2].map((k) => (
            <span key={k} className="size-2 rounded-full bg-white/15" />
          ))}
          <span className="ml-2 font-mono text-[11.5px] text-dim">
            foundry/
          </span>
          <span className="ml-auto font-mono text-[11.5px] text-dim">zsh</span>
        </div>
        <pre className="overflow-x-auto px-4 pt-1 pb-3.5 font-mono text-[11.5px] leading-[1.75] md:text-[12.5px]">
          {lines.map((l, i) => {
            const style = { "--n": l.length, "--d": `${d}s` } as Delay;
            d += l.length * 0.022 + 0.3;
            return (
              <span
                key={l}
                className={`lh-type ${i === 0 ? "text-fg" : "text-muted"}`}
                style={style}
              >
                {l}
              </span>
            );
          })}
          <span className="lh-caret inline-block h-3.5 w-[7px] translate-y-0.5 bg-white/60" />
        </pre>
      </div>
    </div>
  );
}

/**
 * Thirteenth pass, refs HA–HD (index.ts). Entrance: beam ignites → mark lit → flag lands → lines
 * rise from their masks → wires grow out of the mark → horizon draws → the export types itself.
 * The hairline under the terminal hands over to the Works-with hub below (HD).
 */
export function Hero({ log }: { log: string[] }) {
  return (
    <HeroExit>
      <Nav />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center px-4 pt-2 pb-40 text-center md:pt-3 md:pb-56"
      >
        <Focus />
        <a
          href="#product"
          className="lh-up mt-4 inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.04] py-1 pr-3 pl-1.5 text-[12.5px] text-muted transition-colors hover:text-fg md:mt-5"
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
            className="rounded-full bg-primary px-5 py-2.5 font-medium text-[14px] text-primary-fg transition-colors hover:bg-white"
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

        <Terminal log={log} />
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

/** simple-icons paths (CC0) for the two marks that ship as SVG */
const SOLIDITY =
  "M4.409 6.608L7.981.255l3.572 6.353H4.409zM8.411 0l3.569 6.348L15.552 0H8.411zm4.036 17.392l3.572 6.354 3.575-6.354h-7.147zm-.608-10.284h-7.43l3.715 6.605 3.715-6.605zm.428-.25h7.428L15.982.255l-3.715 6.603zM15.589 24l-3.569-6.349L8.448 24h7.141zm-3.856-6.858H4.306l3.712 6.603 3.715-6.603zm.428-.25h7.433l-3.718-6.605-3.715 6.605z";
const ETHEREUM =
  "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z";

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
