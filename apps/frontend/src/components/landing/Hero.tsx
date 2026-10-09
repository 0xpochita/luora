/*
 * Hero refs (sixteenth pass: one ref, HA nav kept):
 *  HA https://id.pinterest.com/pin/760404718381966789/ — Triopixels: glass pill nav
 *  HI https://id.pinterest.com/pin/933300722780733209/ — ZERO by Freede (the shot R13's closing
 *     scene also came from): wordmark + one pill, a two-line centred headline with the second
 *     line tinted, one subline, one App-Store-style button, two hairlines dropping from the top
 *     edge onto the headline and two rules running out from the button, a curved horizon lit
 *     from behind (its phone over the rim was tried and dropped). Nothing else.
 */
import Link from "next/link";
import { LogoText } from "@/components/ui";
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

/**
 * Sixteenth pass (HI ZERO). Hairlines drop onto the headline → lines rise → subline → the button
 * with its rules running out → the horizon lights up. The Works-with hub under the haze is the
 * first product view.
 */
export function Hero() {
  return (
    <HeroExit>
      <Nav />

      {/* HI: a curved horizon lit from behind, the ground black below it */}
      <div
        aria-hidden="true"
        data-lp="hero-horizon"
        className="lh-horizon pointer-events-none absolute inset-x-0 bottom-0 h-[min(62vh,580px)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 1600 640"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
        >
          <defs>
            <radialGradient
              id="lh-dawn"
              gradientUnits="userSpaceOnUse"
              cx="800"
              cy="330"
              r="620"
            >
              <stop offset="0" stopColor="#eef0f5" stopOpacity=".5" />
              <stop offset=".22" stopColor="#b4b9c6" stopOpacity=".2" />
              <stop offset=".55" stopColor="#5b6070" stopOpacity=".06" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lh-rim" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".3" stopColor="#fff" stopOpacity=".9" />
              <stop offset=".5" stopColor="#fff" />
              <stop offset=".7" stopColor="#fff" stopOpacity=".9" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="1600" height="640" fill="url(#lh-dawn)" />
          <ellipse cx="800" cy="1130" rx="1500" ry="800" fill="#09090b" />
          {/* the rim: a soft bloom under a hairline */}
          <ellipse
            cx="800"
            cy="1130"
            rx="1500"
            ry="800"
            fill="none"
            stroke="url(#lh-rim)"
            strokeWidth="8"
            opacity=".35"
          />
          <ellipse
            cx="800"
            cy="1130"
            rx="1500"
            ry="800"
            fill="none"
            stroke="url(#lh-rim)"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto flex min-h-[calc(100svh-76px)] max-w-[1240px] flex-col items-center px-4 pt-[15vh] pb-[42vh] text-center md:pt-[17vh]"
      >
        <div className="relative">
          {/* HI: two hairlines fall from the top edge down the headline's shoulders, each ending
              in a spark at the first line's baseline */}
          <span
            aria-hidden="true"
            className="lh-brace absolute top-[-14vh] bottom-[52%] left-0 hidden w-px bg-gradient-to-b from-transparent via-white/15 to-white/60 after:absolute after:bottom-0 after:left-1/2 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-white after:shadow-[0_0_8px_2px_rgba(255,255,255,.5)] after:content-[''] md:block"
          />
          <span
            aria-hidden="true"
            className="lh-brace absolute top-[-14vh] right-0 bottom-[52%] hidden w-px bg-gradient-to-b from-transparent via-white/15 to-white/60 after:absolute after:bottom-0 after:left-1/2 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-white after:shadow-[0_0_8px_2px_rgba(255,255,255,.5)] after:content-[''] md:block"
          />
          <h1 className="font-medium text-[clamp(36px,5vw,72px)] text-fg leading-[1.08] tracking-[-0.03em]">
            <span className="lh-line">
              <span style={{ "--d": "0.45s" } as Delay}>
                See what your contract
              </span>
            </span>
            <span className="lh-line">
              <span className="lh-tint" style={{ "--d": "0.58s" } as Delay}>
                actually does.
              </span>
            </span>
          </h1>
        </div>
        <p
          className="lh-up mt-4 max-w-[600px] text-[14.5px] text-muted leading-relaxed"
          style={{ "--d": "0.85s" } as Delay}
        >
          Decoded traces, a contract graph and analyzer findings, from your own
          Foundry run.
        </p>

        {/* HI: one small App-Store-style button; rules run out from it to the edges, a spark at
            each inner end */}
        <div
          className="lh-up relative mt-6 flex w-full items-center justify-center"
          style={{ "--d": "1.05s" } as Delay}
        >
          <span
            aria-hidden="true"
            className="lh-rule absolute top-1/2 right-[calc(50%+104px)] left-0 hidden h-px origin-right bg-gradient-to-l from-white/30 to-transparent md:block"
          />
          <span
            aria-hidden="true"
            className="lh-rule absolute top-1/2 right-0 left-[calc(50%+104px)] hidden h-px origin-left bg-gradient-to-r from-white/30 to-transparent md:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-[calc(50%+102px)] hidden size-[3px] -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_1px_rgba(255,255,255,.5)] md:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-[calc(50%+102px)] hidden size-[3px] -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_1px_rgba(255,255,255,.5)] md:block"
          />
          <Link
            href="/atlas"
            className="relative inline-flex h-10 items-center gap-2.5 rounded-full border border-white/25 bg-[#0b0b0d] pr-4 pl-3 transition-colors hover:border-white/50 hover:bg-white/[.04]"
          >
            {/* biome-ignore lint/performance/noImgElement: 18px static brand mark */}
            <img src="/brand/mark-white.png" alt="" width={18} height={18} />
            <span className="flex flex-col items-start text-left leading-none">
              <span className="text-[9.5px] text-muted">
                From your forge run
              </span>
              <span className="mt-[3px] font-medium text-[13px] text-fg">
                Open the Lab
              </span>
            </span>
          </Link>
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
