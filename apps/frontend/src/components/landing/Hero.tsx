/*
 * Hero refs (fifteenth pass, Awwwards winners; HA nav and HC lit mark kept from earlier passes):
 *  HA https://id.pinterest.com/pin/760404718381966789/ — Triopixels: glass pill nav
 *  HC https://id.pinterest.com/pin/4081455908271646/ — Ascend: one big monochrome lit object
 *  HF https://www.awwwards.com/sites/cerebrium (SOTD, AI infra) — editorial split: a huge light
 *     three-line headline bottom-left with one emphasised phrase, copy + two CTAs at its baseline
 *     on the right, the hero visual bleeding behind the right half, a hairline + stack strip below
 *  HG https://www.awwwards.com/sites/aspen-search (SOTD) — strict hairline grid, a mono
 *     metadata rail along the top edge (time · place), halftone dot fields, huge type
 *  HH https://www.awwwards.com/sites/evervault (HM, payments security) — below the headline the
 *     product itself: a left capabilities panel ('always on' pills) beside a ledger with status
 *     badges and a totals footer
 */
import Link from "next/link";
import { LogoText } from "@/components/ui";
import type { AtlasData, Risk } from "@/features/atlas/types";
import {
  flaggedLines,
  lineRanges,
  reportsOf,
  TOOL_LABEL,
} from "@/features/atlas/utils/findings";
import { ICON_PATH } from "@/features/atlas/utils/icons";
import { GitHubMark } from "./GitHubMark";
import { HeroExit } from "./Haze";
import { ProductTabs } from "./ProductTabs";
import { ScatterGrow } from "./ScatterGrow";
import {
  demoAtlas,
  type SampleRun,
  sampleRun,
  scenarioDemo,
  traceFrames,
} from "./stats";
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
const RISK_ORDER: Record<Risk, number> = { high: 0, med: 1, low: 2, info: 3 };
const RISK_LABEL: Record<Risk, string> = {
  high: "HIGH",
  med: "MEDIUM",
  low: "LOW",
  info: "INFO",
};
const findingsOf = (atlas: AtlasData) =>
  atlas.pieces
    .filter((p) => p.sys === "vulns")
    .sort(
      (a, b) =>
        RISK_ORDER[a.risk ?? "low"] - RISK_ORDER[b.risk ?? "low"] ||
        a.name.localeCompare(b.name),
    );
const testsOf = (run: SampleRun) =>
  run.stats.find((s) => s.label === "forge tests traced")?.value;

/**
 * HG Aspen: a mono metadata rail along the hero's top edge, the run's own facts where Aspen
 * prints the time and the place.
 */
function Rail({ atlas, run }: { atlas: AtlasData; run: SampleRun }) {
  const tests = testsOf(run);
  const items = [
    atlas.file.split("/").pop() ?? atlas.file,
    `solc ${atlas.compiler}`,
    run.tools[0],
    tests && `${tests} tests`,
    `${findingsOf(atlas).length} findings`,
  ].filter((x): x is string => !!x);
  return (
    <div
      className="lh-up flex flex-wrap items-center gap-x-5 gap-y-1 border-white/[.07] border-b py-3 font-mono text-[11px] text-dim tracking-[0.04em]"
      style={{ "--d": "0.4s" } as Delay}
    >
      {items.map((t, i) => (
        <span key={t} className="flex items-center gap-5">
          {i > 0 && (
            <span aria-hidden="true" className="size-[3px] bg-white/25" />
          )}
          {t}
        </span>
      ))}
      <span className="ml-auto hidden text-white/35 md:inline">
        local run · read only
      </span>
    </div>
  );
}

/**
 * HH Evervault: the product sits right under the headline as two panels, a capabilities list on
 * the left ('always on' pills) beside a ledger with status badges and a totals footer. All of it
 * is read from the sample run: the counts, the findings (worst first, every tool that reported
 * each, the lines it flags) and the totals.
 */
function Deck({ atlas, run }: { atlas: AtlasData; run: SampleRun }) {
  const findings = findingsOf(atlas);
  const rows = findings.slice(0, 5);
  const high = findings.filter((f) => f.risk === "high").length;
  const entries = atlas.pieces.filter((p) => p.sys === "entry").length;
  const tests = testsOf(run);
  const cov = atlas.coverage?.lines;
  const pct = cov?.found ? Math.round((cov.hit / cov.found) * 100) : null;
  const analyzers = [
    ...new Set(findings.flatMap((f) => reportsOf(f).map((r) => r.tool))),
  ].filter((t) => t !== "manual");
  const caps = [
    {
      icon: "M4 17l6-5-6-5M12 19h8",
      label: "Decoded trace",
      meta: tests ? `${tests} forge tests` : "forge test -vvvv",
      on: true,
    },
    {
      icon: ICON_PATH.fn,
      label: "Contract graph",
      meta: `${entries} entry points`,
      on: true,
    },
    {
      icon: ICON_PATH.warn,
      label: "Findings merged",
      meta: analyzers.length
        ? analyzers.map((t) => TOOL_LABEL[t]).join(" · ")
        : "Luora checks",
      on: true,
    },
    {
      icon: ICON_PATH.grid,
      label: "Coverage",
      meta: pct == null ? "forge coverage" : `${pct}% of lines`,
      on: pct != null,
    },
  ];
  const sev = (r?: Risk) =>
    r === "high" || r === "med"
      ? "border-red/40 bg-red/[.08] text-red"
      : "border-white/[.1] bg-white/[.04] text-muted";

  return (
    <div className="lh-deck relative mt-12 grid w-full gap-3 text-left md:mt-14 md:grid-cols-[300px_minmax(0,1fr)] md:gap-4">
      {/* capabilities */}
      <div className="rounded-[18px] border border-white/[.08] bg-gradient-to-b from-[#161618] to-[#0e0e10] p-2 shadow-float md:self-start">
        {caps.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 px-3 py-3 [&+&]:border-white/[.06] [&+&]:border-t"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-white/[.08] bg-[#0b0b0c] text-white/70">
              {glyph(c.icon, "size-[17px]")}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13.5px] text-fg">{c.label}</span>
              <span className="truncate font-mono text-[11px] text-dim">
                {c.meta}
              </span>
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] ${
                c.on
                  ? "border-white/[.14] bg-white/[.06] text-text"
                  : "border-white/[.08] text-dim"
              }`}
            >
              {c.on && glyph(ICON_PATH.check, "size-2.5")}
              {c.on ? "ALWAYS ON" : "OPTIONAL"}
            </span>
          </div>
        ))}
      </div>

      {/* ledger */}
      <div className="overflow-hidden rounded-[18px] border border-white/[.08] bg-gradient-to-b from-[#141416] to-[#0c0c0d] shadow-float">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="text-dim [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-normal [&>th]:text-[11px] [&>th]:tracking-[0.04em]">
              <th>Finding</th>
              <th className="hidden md:table-cell">Reported by</th>
              <th>Severity</th>
              <th className="text-right">Lines</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const id = f.name.match(/^[A-Z]-\d+/)?.[0] ?? f.id;
              const title = f.name.replace(/^[A-Z]-\d+\s*/, "");
              const lines =
                f.line == null ? "" : `L${lineRanges(flaggedLines(f, f.line))}`;
              return (
                <tr
                  key={f.id}
                  className="border-white/[.06] border-t [&>td]:px-4 [&>td]:py-3"
                >
                  <td className="w-full max-w-0">
                    <span className="flex items-center gap-2.5">
                      <span className="whitespace-nowrap font-mono text-[11.5px] text-dim">
                        {id}
                      </span>
                      <span className="truncate text-fg">{title}</span>
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap md:table-cell">
                    <span className="flex gap-1">
                      {[...new Set(reportsOf(f).map((r) => r.tool))].map(
                        (t) => (
                          <span
                            key={t}
                            className="rounded-[6px] border border-white/[.08] bg-white/[.03] px-1.5 py-0.5 font-mono text-[10.5px] text-muted"
                          >
                            {TOOL_LABEL[t]}
                          </span>
                        ),
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] ${sev(f.risk)}`}
                    >
                      {(f.risk === "high" || f.risk === "med") && "▲ "}
                      {RISK_LABEL[f.risk ?? "low"]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right font-mono text-[11.5px] text-muted">
                    {lines}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between gap-4 border-white/[.08] border-t bg-black/30 px-4 py-3">
          <span className="flex flex-col">
            <span className="font-mono text-[10px] text-dim tracking-[0.08em]">
              FINDINGS
            </span>
            <span className="font-medium text-[18px] text-fg">
              {findings.length}
              <span className="ml-1.5 font-mono text-[11px] text-red">
                {high} high
              </span>
            </span>
          </span>
          {pct != null && (
            <span className="flex flex-col items-end">
              <span className="font-mono text-[10px] text-dim tracking-[0.08em]">
                LINE COVERAGE
              </span>
              <span className="font-medium text-[18px] text-fg">{pct}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Fifteenth pass (Awwwards: HF Cerebrium, HG Aspen, HH Evervault). Rail → headline lines rise →
 * copy + CTAs → the lit mark behind the right half → the product deck below → the hairline that
 * hands over to the Works-with hub.
 */
export async function Hero() {
  const [atlas, run] = await Promise.all([demoAtlas(), sampleRun()]);
  return (
    <HeroExit>
      <Nav />

      <div
        data-lp="hero-body"
        className="relative z-10 mx-auto max-w-[1240px] px-4 pt-6 pb-32 md:px-6 md:pt-8 md:pb-44"
      >
        {/* HG: hairline column guides */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 hidden w-px bg-white/[.05] md:left-6 md:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 hidden w-px bg-white/[.05] md:right-6 md:block"
        />
        {/* HC + HG: the lit mark bleeding behind the right half, over a halftone dot field */}
        <div
          aria-hidden="true"
          className="lh-field pointer-events-none absolute top-[40px] right-[-120px] hidden size-[640px] md:block"
        >
          <Mark className="lh-bigmark absolute inset-0 size-full" />
        </div>

        <Rail atlas={atlas} run={run} />

        {/* HF: editorial split */}
        <div className="relative grid gap-8 pt-10 md:grid-cols-12 md:items-end md:pt-14">
          <div className="md:col-span-8">
            <a
              href="#product"
              className="lh-up mb-7 inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.04] py-1 pr-3 pl-1.5 text-[12.5px] text-muted transition-colors hover:text-fg"
              style={{ "--d": "0.55s" } as Delay}
            >
              <span className="rounded-full bg-white/[.08] px-2 py-0.5 font-mono text-[11.5px] text-text">
                forge test -vvvv
              </span>
              Reads your local Foundry runs
            </a>
            <h1 className="font-light text-[clamp(46px,7.4vw,104px)] text-fg leading-[0.98] tracking-[-0.04em]">
              <span className="lh-line">
                <span style={{ "--d": "0.65s" } as Delay}>See what</span>
              </span>
              <span className="lh-line">
                <span style={{ "--d": "0.76s" } as Delay}>your contract</span>
              </span>
              <span className="lh-line text-white/45">
                <span style={{ "--d": "0.87s" } as Delay}>actually does.</span>
              </span>
            </h1>
          </div>
          <div
            className="lh-up md:col-span-4 md:pb-3"
            style={{ "--d": "1s" } as Delay}
          >
            <p className="max-w-[360px] text-[15.5px] text-body leading-relaxed md:text-[16px]">
              Decoded traces, a contract graph you can write tests on, and
              analyzer findings you can triage. All from the code you are
              reviewing.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/atlas"
                className="rounded-full bg-primary px-5 py-2.5 font-medium text-[14px] text-primary-fg shadow-[0_0_32px_rgba(255,255,255,.18)] transition-[background-color,box-shadow] hover:bg-white hover:shadow-[0_0_44px_rgba(255,255,255,.3)]"
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
          </div>
        </div>

        <Deck atlas={atlas} run={run} />

        <div
          aria-hidden="true"
          className="lh-up mx-auto mt-10 h-24 w-px bg-gradient-to-b from-white/25 to-transparent"
          style={{ "--d": "2s" } as Delay}
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
