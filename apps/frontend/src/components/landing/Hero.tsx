/*
 * Hero refs (seventeenth pass: one ref, HA nav kept):
 *  HA https://id.pinterest.com/pin/760404718381966789/ — Triopixels: glass pill nav
 *  HJ https://id.pinterest.com/pin/1148699448726643412/ — VEX (MotionSites AI): a black sky with
 *     soft light pooled bottom-left and top-right, a fine star field, one bright curved glint on
 *     the right; notched hairline frame under the nav; a two-line regular-weight headline, one
 *     subline, a white button beside an outlined one; a hairline chip at the bottom centre with
 *     thin lines falling from it.
 */
import Link from "next/link";
import { LogoText } from "@/components/ui";
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

const SOLIDITY =
  "M4.409 6.608L7.981.255l3.572 6.353H4.409zM8.411 0l3.569 6.348L15.552 0H8.411zm4.036 17.392l3.572 6.354 3.575-6.354h-7.147zm-.608-10.284h-7.43l3.715 6.605 3.715-6.605zm.428-.25h7.428L15.982.255l-3.715 6.603zM15.589 24l-3.569-6.349L8.448 24h7.141zm-3.856-6.858H4.306l3.712 6.603 3.715-6.603zm.428-.25h7.433l-3.718-6.605-3.715 6.605z";
const ETHEREUM =
  "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z";

/** deterministic, so the star field is identical on every render (same rng as CityHorizon) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** HJ: ~140 stars in two brightnesses, one path each */
const STARS = (() => {
  const rand = rng(5);
  const by: Record<string, string> = {};
  for (let i = 0; i < 140; i++) {
    const x = Math.round(rand() * 1600);
    const y = Math.round(rand() * 900);
    const r = rand() < 0.15 ? 2 : 1.3;
    const a = rand() < 0.3 ? "0.75" : "0.35";
    by[a] = `${by[a] ?? ""}M${x} ${y}h${r}v${r}h-${r}z`;
  }
  return Object.entries(by);
})();

/** HJ: the notch under the nav: a hairline in from the edge, then up to the nav's hairline */
const Notch = ({ side }: { side: "left" | "right" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 160 60"
    className={`lh-notch absolute top-[76px] h-[60px] w-[160px] ${
      side === "left" ? "left-0 origin-left" : "right-0 origin-right"
    }`}
    fill="none"
    stroke="rgba(255,255,255,.22)"
    strokeWidth="1"
  >
    <path
      d={side === "left" ? "M0 59.5H80L140 0.5H160" : "M160 59.5H80L20 0.5H0"}
    />
  </svg>
);

/**
 * Seventeenth pass (HJ VEX). The sky fades up → stars → the notches draw in from the edges →
 * lines rise → subline → buttons → the chip and its lines at the foot. The Works-with hub under
 * the haze is the first product view.
 */
export function Hero() {
  return (
    <HeroExit>
      <Nav />

      {/* HJ: the sky, soft light bottom-left and top-right, a star field, one curved glint */}
      <div
        aria-hidden="true"
        data-lp="hero-sky"
        className="lh-sky pointer-events-none absolute inset-0"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full"
        >
          <g fill="#fff">
            {STARS.map(([a, d]) => (
              <path key={a} d={d} opacity={a} />
            ))}
          </g>
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 320 120"
          className="lh-glint absolute top-[56%] right-[7%] hidden h-[120px] w-[320px] md:block"
          fill="none"
        >
          <defs>
            <linearGradient id="lh-glint" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".55" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M10 110C110 50 200 20 310 10"
            stroke="url(#lh-glint)"
            strokeWidth="10"
            opacity=".25"
          />
          <path
            d="M10 110C110 50 200 20 310 10"
            stroke="url(#lh-glint)"
            strokeWidth="2"
          />
        </svg>
        {/* faint guide lines down the left, as in the ref */}
        <span className="absolute top-0 left-[4.5%] hidden h-[55%] w-px bg-gradient-to-b from-white/10 to-transparent md:block" />
        <span className="absolute top-0 left-[7%] hidden h-[40%] w-px bg-gradient-to-b from-white/[.07] to-transparent md:block" />
      </div>
      <Notch side="left" />
      <Notch side="right" />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto flex min-h-[calc(100svh-76px)] max-w-[1240px] flex-col items-center justify-center px-4 pt-6 pb-40 text-center md:pb-48"
      >
        <h1 className="font-normal text-[clamp(34px,4.3vw,66px)] text-fg leading-[1.1] tracking-[-0.025em]">
          <span className="lh-line">
            <span style={{ "--d": "0.45s" } as Delay}>
              See what your contract
            </span>
          </span>
          <span className="lh-line">
            <span style={{ "--d": "0.58s" } as Delay}>actually does.</span>
          </span>
        </h1>
        <p
          className="lh-up mt-4 max-w-[600px] text-[15px] text-muted leading-relaxed md:text-[16px]"
          style={{ "--d": "0.85s" } as Delay}
        >
          Decoded traces, a contract graph and analyzer findings, from your own
          Foundry run.
        </p>
        <div
          className="lh-up mt-7 flex flex-wrap items-center justify-center gap-3"
          style={{ "--d": "1.05s" } as Delay}
        >
          <Link
            href="/atlas"
            className="inline-flex h-11 items-center rounded-[8px] bg-primary px-6 font-medium text-[14px] text-primary-fg transition-colors hover:bg-white"
          >
            Open the Lab
          </Link>
          <a
            href={GITHUB}
            className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-white/20 bg-black/40 px-6 text-[14px] text-fg transition-colors hover:border-white/40 hover:bg-white/[.05]"
          >
            <GitHubMark />
            View on GitHub
          </a>
        </div>

        {/* HJ: the chip at the foot, thin lines falling from behind it */}
        <div
          className="lh-up absolute bottom-[7%] left-1/2 -translate-x-1/2"
          style={{ "--d": "1.4s" } as Delay}
        >
          {[-90, -30, 30, 90].map((x) => (
            <span
              key={x}
              aria-hidden="true"
              className="absolute top-1/2 bottom-[-60vh] w-px bg-gradient-to-b from-white/[.14] via-white/[.06] to-transparent"
              style={{ left: `calc(50% + ${x}px)` }}
            />
          ))}
          <span className="relative inline-block rounded-[10px] border border-white/[.14] bg-[#060607]/80 px-6 py-2.5 text-[15px] text-muted">
            Trace. Graph. Triage.
          </span>
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
