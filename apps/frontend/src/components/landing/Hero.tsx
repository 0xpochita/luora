import Link from "next/link";
import { LogoText } from "@/components/ui";
import { ICON_PATH, type IconKey } from "@/features/atlas/utils/icons";
import { GitHubMark } from "./GitHubMark";
import { HeroExit } from "./Haze";
import { ProductTabs } from "./ProductTabs";
import { ScatterGrow } from "./ScatterGrow";
import { demoAtlas, scenarioDemo, traceFrames } from "./stats";

export const GITHUB = "https://github.com/0xpochita/luora";
export const DOCS = `${GITHUB}#readme`;

/** R1 / R3: logo left, one centred pill group with a tiny active pill, a white "Open app" pill right. */
export function Nav() {
  const items = [
    { label: "Product", href: "#product", on: true },
    { label: "How it works", href: "#how-it-works" },
    { label: "Docs", href: DOCS },
    { label: "GitHub", href: GITHUB },
  ];
  return (
    <nav className="relative z-20 mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-4 md:px-6">
      <Link href="/" className="flex items-center gap-2.5" aria-label="Luora">
        <LogoText height={28} />
      </Link>
      <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/[.08] bg-[#0b0b0c]/85 p-1 md:flex">
        {items.map((i) => (
          <li key={i.label}>
            <a
              href={i.href}
              aria-current={i.on ? "page" : undefined}
              className={`block rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                i.on ? "bg-white/[.09] text-fg" : "text-muted hover:text-fg"
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
        Open app
      </Link>
    </nav>
  );
}

/** R2 vanishing point (also the starburst's centre) in the backdrop's 1440-wide space. */
const VP = { x: 720, y: 150 };
const RAYS = [-520, 120, 470, 970, 1320, 1960];

/**
 * R2: hairline perspective lines converging on a thin white starburst; R1: cross markers on the
 * lines. Sliced from the top centre so the mark stays put at every width.
 */
function Backdrop() {
  const { x, y } = VP;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 960"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none absolute inset-x-0 top-0 h-[960px] w-full"
    >
      <defs>
        <radialGradient
          id="lp-fade"
          gradientUnits="userSpaceOnUse"
          cx={x}
          cy={y}
          r="900"
        >
          <stop offset="0.04" stopColor="#000" />
          <stop offset="0.1" stopColor="#fff" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="lp-mask">
          <rect width="1440" height="960" fill="url(#lp-fade)" />
        </mask>
      </defs>
      <g mask="url(#lp-mask)" stroke="#fff" strokeOpacity="0.11" fill="none">
        <path d={`M0 ${y}H1440M${x} 0V${y}`} />
        <path
          d={`M${x} ${y}L${x - 760} ${y - 760}M${x} ${y}L${x + 760} ${y - 760}`}
        />
        {RAYS.map((bx) => (
          <path key={bx} d={`M${x} ${y}L${bx} 960`} />
        ))}
      </g>
      <g stroke="#fff" strokeOpacity="0.3">
        {[
          [250, y],
          [1190, y],
          [120, 600],
          [1320, 600],
        ].map(([cx, cy]) => (
          <path key={cx} d={`M${cx - 5} ${cy}h10M${cx} ${cy - 5}v10`} />
        ))}
      </g>
      <g stroke="#fff" strokeWidth="2.5" transform={`translate(${x} ${y})`}>
        <g className="lp-breathe">
          <path d="M0-7V-34M0 7V34M-7 0H-34M7 0H34" />
          <path d="M6-6L19-19M-6 6L-19 19M-6-6L-19-19M6 6L19 19" />
        </g>
      </g>
    </svg>
  );
}

type Orbit = {
  icon: IconKey;
  label: string;
  sub: string;
  x: number;
  y: number;
  /** wire from the frame edge into the node (R3) */
  d: string;
  bad?: boolean;
};

/** R3: small labelled nodes on thin lines around the headline, named after real Lab pieces. */
const ORBITS: Orbit[] = [
  {
    icon: "fn",
    label: "deposit()",
    sub: "entry · anyone",
    x: 180,
    y: 70,
    d: "M0 128H60C120 128 110 70 170 70",
  },
  {
    icon: "cylinder",
    label: "slot 5 · totalShares",
    sub: "written by deposit",
    x: 110,
    y: 290,
    d: "M0 230H30C70 230 60 290 100 290",
  },
  {
    icon: "eye",
    label: "IOracle",
    sub: "getPrice()",
    x: 1060,
    y: 80,
    d: "M1240 140H1180C1120 140 1130 80 1070 80",
  },
  {
    icon: "warn",
    label: "▲ finding",
    sub: "F-01 · high",
    x: 1130,
    y: 300,
    d: "M1240 250H1210C1170 250 1180 300 1140 300",
    bad: true,
  },
];

function Orbits() {
  return (
    <div
      aria-hidden="true"
      data-lp="hero-body"
      className="pointer-events-none absolute inset-x-0 top-[190px] mx-auto hidden h-[380px] max-w-[1240px] lg:block"
    >
      <svg
        aria-hidden="true"
        data-smil
        viewBox="0 0 1240 380"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.18"
      >
        {ORBITS.map((o) => (
          <path
            key={o.label}
            d={o.d}
            pathLength={1}
            className="lp-draw"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {ORBITS.map((o, i) => (
          <circle
            key={`p-${o.label}`}
            r="2.5"
            stroke="none"
            fill={o.bad ? "var(--red)" : "#fff"}
            opacity="0"
            className="lp-packet"
          >
            <animate
              attributeName="opacity"
              dur="4.2s"
              begin={`${1.8 + i * 1.05}s`}
              repeatCount="indefinite"
              values="0;1;1;0"
              keyTimes="0;0.1;0.85;1"
            />
            <animateMotion
              dur="4.2s"
              begin={`${1.8 + i * 1.05}s`}
              repeatCount="indefinite"
              path={o.d}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1"
            />
          </circle>
        ))}
      </svg>
      {ORBITS.map((o) => (
        <div
          key={o.label}
          className="lp-fade absolute flex -translate-y-1/2 items-center gap-3 whitespace-nowrap"
          style={{
            left: `${(o.x / 1240) * 100}%`,
            top: `${(o.y / 380) * 100}%`,
          }}
        >
          <span className="grid size-8 -translate-x-1/2 place-items-center rounded-full border border-white/15 bg-black text-muted">
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
              <path d={ICON_PATH[o.icon]} />
            </svg>
          </span>
          <span className="-ml-3 flex flex-col">
            <span className="flex items-center gap-1.5 font-mono text-[12.5px] text-text">
              <span
                className={`size-1.5 rounded-full ${o.bad ? "bg-red" : "bg-white/70"}`}
              />
              {o.label}
            </span>
            <span className="pl-3 text-[12px] text-dim">{o.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Headline words rise out of a blur one by one (lp-word); the text stays plain for readers. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((w, i) => (
    <span
      key={w}
      className="lp-word"
      style={{ "--i": from + i } as React.CSSProperties}
    >
      {w}
      {i < text.split(" ").length - 1 && "\u00a0"}
    </span>
  ));
}

/** R8 (onorca.dev shows the real agent output): what `node luora-export.mjs` printed for the sample vault. */
function Terminal({ log }: { log: string[] }) {
  const lines = ["$ node luora-export.mjs", ...log];
  let d = 1.2;
  return (
    <div className="mt-8 w-full max-w-[560px] overflow-hidden rounded-[14px] border border-white/[.08] bg-[#0a0a0b]/90 text-left shadow-float">
      <div className="flex items-center gap-1.5 border-white/[.06] border-b px-3.5 py-2">
        {[0, 1, 2].map((k) => (
          <span key={k} className="size-2 rounded-full bg-white/15" />
        ))}
        <span className="ml-2 font-mono text-[11.5px] text-dim">foundry/</span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[11.5px] leading-[1.75] md:text-[12.5px]">
        {lines.map((l, i) => {
          const style = {
            "--n": l.length,
            "--d": `${d}s`,
          } as React.CSSProperties;
          d += l.length * 0.025 + 0.35;
          return (
            <span
              key={l}
              className={`lp-type ${i === 0 ? "text-fg" : "text-muted"}`}
              style={style}
            >
              {l}
            </span>
          );
        })}
        <span className="lp-caret inline-block h-3.5 w-[7px] translate-y-0.5 bg-white/60" />
      </pre>
    </div>
  );
}

/** R2 + R1 + R3 + R26 + R8, see index.ts. */
export function Hero({ log }: { log: string[] }) {
  return (
    <HeroExit>
      <Backdrop />
      {/* R1: one soft monochrome beam from the top, drifting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
      >
        <div className="lp-beam h-[640px] w-[560px]" />
        <div className="lp-beam-core absolute top-0 left-1/2 -ml-[30px] h-[150px] w-[60px]" />
      </div>
      <Nav />
      <Orbits />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center px-4 pt-[140px] pb-40 text-center md:pt-[150px] md:pb-56"
      >
        <a
          href="#product"
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.04] py-1 pr-3 pl-1.5 text-[12.5px] text-muted transition-colors hover:text-fg"
        >
          <span className="rounded-full bg-white/[.08] px-2 py-0.5 font-mono text-[11.5px] text-text">
            forge test -vvvv
          </span>
          Reads your local Foundry runs
        </a>
        <h1 className="max-w-[900px] font-light text-[clamp(40px,7vw,80px)] text-fg leading-[1.02] tracking-[-0.035em]">
          <Words text="See what your contract" />
          <br />
          <span className="text-white/45">
            <Words text="actually does." from={4} />
          </span>
        </h1>
        <p className="mt-6 max-w-[520px] text-[16px] text-body leading-relaxed md:text-[17px]">
          Decoded traces, a contract graph you can write tests on, and analyzer
          findings you can triage. All from code you are reviewing.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
      </div>

      {/* R1: vertical scroll label on the right edge */}
      <a
        href="#product"
        className="absolute top-[420px] right-5 z-10 hidden items-center gap-3 text-[12px] text-dim [writing-mode:vertical-rl] hover:text-muted xl:flex"
      >
        Scroll to explore
        <span className="h-10 w-px bg-white/20" />
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
  const [atlas, trace, scenario] = await Promise.all([
    demoAtlas(),
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
      <ProductTabs atlas={atlas} frames={trace.frames} scenario={scenario} />
    </ScatterGrow>
  );
}
