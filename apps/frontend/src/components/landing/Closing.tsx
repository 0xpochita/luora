import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui";
import { CityHorizon } from "./CityHorizon";
import { GitHubMark } from "./GitHubMark";
import { FinaleRise } from "./Haze";
import { DOCS, GITHUB } from "./Hero";
import { Exit, Reveal } from "./motion";

/** One row: what you get, what Luora shows (a full sentence, R29), what the CLIs give today (null = nothing). */
const ROWS: { what: string; luora: string; cli: string | null }[] = [
  {
    what: "Decoded calls, events and cheatcodes",
    luora: "Every call, event and cheatcode decoded with your own ABIs.",
    cli: "A text tree from forge -vvvv",
  },
  {
    what: "Source lines each frame executed",
    luora: "Each frame opens on the source lines it ran.",
    cli: "Step through them in forge debug",
  },
  {
    what: "Storage reads and writes per line",
    luora: "Slot reads and writes pinned to the line that made them.",
    cli: "Step through them in forge debug",
  },
  {
    what: "Call graph per test",
    luora: "A call graph drawn for every test.",
    cli: null,
  },
  {
    what: "Slither and Aderyn merged per issue",
    luora: "Slither and Aderyn merged into one finding per issue.",
    cli: "Two separate reports",
  },
  {
    what: "Triage status and Markdown report",
    luora: "Triage each finding, then export a Markdown report.",
    cli: null,
  },
  {
    what: "Coverage per function, untested first",
    luora: "Coverage per function, untested ones listed first.",
    cli: "A per-file table from forge coverage",
  },
  {
    what: "Wire a scenario, export a .t.sol",
    luora: "Wire actors and calls, export the scenario as a .t.sol.",
    cli: "Written by hand",
  },
];

/** R27 / R29: a check in a small circle (Luora column). */
function CheckCircle() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 flex-none text-fg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="7" strokeOpacity="0.55" />
      <path d="M5 8.2L7.1 10.2L11 6" />
    </svg>
  );
}

/** R27 / R28: ✕ where the CLIs have nothing — muted, it is a missing feature, not a finding. */
function Cross() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 flex-none text-white/30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" />
    </svg>
  );
}

/** R29: competitor cells lead with an icon too; a hollow dim ring where the CLIs do have something. */
function Ring() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 flex-none text-white/25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}

function CliCell({ cli }: { cli: string | null }) {
  return cli ? (
    <>
      <Ring />
      <span>{cli}</span>
    </>
  ) : (
    <>
      <Cross />
      <span className="sr-only">Not available</span>
    </>
  );
}

/**
 * R28 (pin/175218241748813574, Ortocosmos "Competitor analysis"): '№ / Subject / About' over a
 * hairline, a bracketed index, the table hung from the Subject column.
 * R27 (pin/36028865763636582, Ageeva "A card with features you won't find anywhere else"): the
 * product column is one raised, lighter, rounded card standing above the flat table, its header the
 * product name, checks in small circles, ✕ for missing.
 * R29 (pin/36028865764245218, Ageeva "Constructor vs Legacy vs Building In-House"): every cell a
 * short full sentence behind a leading icon. Mobile: one stacked card per row.
 */
export function Compare() {
  return (
    <section
      data-tone="compare"
      className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6"
    >
      <Exit>
        <Reveal>
          {/* R28 header row */}
          <div className="hidden grid-cols-[140px_5fr_6fr] gap-6 border-white/[.14] border-b pb-2 text-[12.5px] text-dim md:grid">
            <span>№</span>
            <span>Subject</span>
            <span>About</span>
          </div>
          <div className="grid gap-4 pt-5 md:grid-cols-[140px_5fr_6fr] md:gap-6">
            <span className="font-mono text-[15px] text-muted md:text-[22px] md:text-fg md:leading-[1.2]">
              [007]
            </span>
            <h2 className="font-medium text-[clamp(30px,3.6vw,46px)] text-fg leading-[1.04] tracking-[-0.03em]">
              Same run,
              <br />
              <span className="text-white/45">read differently.</span>
            </h2>
            <p className="max-w-[460px] text-[16px] text-muted leading-relaxed">
              Luora does not replace forge or the analyzers. It reads what they
              already produce and lays it over the contract.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-16 md:ml-[164px]">
          {/* desktop: three columns, the Luora column one raised card spanning every row (R27) */}
          <table className="relative hidden grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)_minmax(0,1fr)] grid-rows-[auto_repeat(8,auto)] text-left before:col-start-2 before:row-start-1 before:row-end-[-1] before:-mt-3 before:-mb-4 before:rounded-card before:border before:border-white/[.13] before:bg-card-grad before:shadow-[0_0_80px_-12px_rgba(255,255,255,.14),0_24px_48px_rgba(0,0,0,.55)] md:grid">
            <caption className="sr-only">
              Luora compared with forge and the analyzer CLIs
            </caption>
            <thead className="contents">
              <tr className="contents">
                <th className="col-start-1 row-start-1 self-end pb-4 font-normal text-[13px] text-dim">
                  What you get
                </th>
                <th className="relative col-start-2 row-start-1 flex items-center gap-2.5 px-6 pt-4 pb-5 font-medium text-[17px] text-fg">
                  <LogoMark />
                  Luora
                </th>
                <th className="col-start-3 row-start-1 self-end px-6 pb-4 font-normal text-[13px] text-dim">
                  forge + analyzer CLIs
                </th>
              </tr>
            </thead>
            <tbody className="contents">
              {ROWS.map((r, i) => (
                <tr key={r.what} className="contents">
                  <th
                    scope="row"
                    className="col-start-1 border-white/[.07] border-t py-4 pr-4 font-normal text-[14px] text-body"
                    style={{ gridRowStart: i + 2 }}
                  >
                    {r.what}
                  </th>
                  <td
                    className="relative col-start-2 mx-3 flex gap-3 border-white/[.06] border-t px-3 py-4 text-[14px] text-fg leading-snug"
                    style={{ gridRowStart: i + 2 }}
                  >
                    <CheckCircle />
                    {r.luora}
                  </td>
                  <td
                    className="col-start-3 flex gap-3 border-white/[.07] border-t px-6 py-4 text-[13px] text-dim leading-snug"
                    style={{ gridRowStart: i + 2 }}
                  >
                    <CliCell cli={r.cli} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* mobile: one stacked card per row */}
          <ul className="space-y-3 md:hidden">
            {ROWS.map((r) => (
              <li
                key={r.what}
                className="rounded-card border border-white/[.07] bg-[#0c0c0d] p-2"
              >
                <p className="px-3 pt-2 pb-2.5 text-[13px] text-dim">
                  {r.what}
                </p>
                <div className="rounded-inner border border-white/[.13] bg-card-grad p-3 shadow-[0_0_40px_-12px_rgba(255,255,255,.14)]">
                  <p className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
                    <span className="size-1.5 rounded-full bg-white" />
                    Luora
                  </p>
                  <p className="flex gap-2.5 text-[14px] text-fg leading-snug">
                    <CheckCircle />
                    {r.luora}
                  </p>
                </div>
                <p className="flex gap-2.5 px-3 pt-3 pb-2 text-[13px] text-dim leading-snug">
                  <CliCell cli={r.cli} />
                  {r.cli ? null : (
                    <span aria-hidden="true">Not in the CLIs</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Exit>
    </section>
  );
}

/** R32: a small monochrome icon badge sitting on a circle outline at `deg` (0 = right, clockwise). */
function Badge({
  cx,
  cy,
  r,
  deg,
  children,
}: {
  cx: number;
  cy: number;
  r: number;
  deg: number;
  children: ReactNode;
}) {
  const a = (deg * Math.PI) / 180;
  const x = Math.round(cx + r * Math.cos(a));
  const y = Math.round(cy + r * Math.sin(a));
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* a canvas-coloured collar breaks the ring around the badge, as in R32 */}
      <circle r="30" fill="var(--lp-bg, #000)" />
      <circle
        r="24"
        fill="var(--raised)"
        stroke="#fff"
        strokeOpacity="0.16"
        strokeWidth="1.5"
      />
      <g
        fill="none"
        stroke="var(--fg)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </g>
  );
}

/**
 * R32 (pin/65372632087024928, "Our Approach: Simplicity ⇄ Efficiency"): two large thin circles side by
 * side, a ⇄ glyph between them, one word centred in each, icon badges sitting on the outlines.
 * Rounded coordinates, SSR-safe; the rings draw in once revealed (lp-ring, off under reduced motion).
 */
function Rings() {
  const R = 200;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 460"
      className="w-full overflow-visible"
    >
      <g fill="none" stroke="#fff" strokeOpacity="0.13" strokeWidth="3">
        <circle
          className="lp-ring"
          cx="250"
          cy="230"
          r={R}
          pathLength={1}
          transform="rotate(-90 250 230)"
        />
        <circle
          className="lp-ring"
          cx="750"
          cy="230"
          r={R}
          pathLength={1}
          transform="rotate(90 750 230)"
        />
      </g>
      <g
        className="font-sans"
        fill="var(--fg)"
        fontSize="46"
        letterSpacing="-1"
        textAnchor="middle"
      >
        <text x="250" y="246">
          Reads
        </text>
        <text x="750" y="246" fill="var(--muted)">
          Never
        </text>
      </g>
      {/* ⇄ link between the circles */}
      <g
        fill="none"
        stroke="var(--fg)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M478 222H522M512 212L522 222L512 232" />
        <path d="M522 240H478M488 230L478 240L488 250" />
      </g>
      {/* left: a report being read */}
      <Badge cx={250} cy={230} r={R} deg={130}>
        <path d="M-7 -10H3L8 -5V10H-7Z" />
        <path d="M-3 0H4M-3 5H4" />
      </Badge>
      {/* left: decoded, mapped */}
      <Badge cx={250} cy={230} r={R} deg={-40}>
        <circle r="3" />
        <path d="M-9 -7L-3 -2M9 -7L3 -2M0 3V10" />
      </Badge>
      {/* right: no live chain */}
      <Badge cx={750} cy={230} r={R} deg={-130}>
        <path d="M-4 4L4 -4" />
        <path d="M-2 -6L1 -9A4 4 0 0 1 9 -1L6 2" />
        <path d="M2 6L-1 9A4 4 0 0 1 -9 1L-6 -2" />
        <path d="M-10 -10L10 10" strokeOpacity="0.6" />
      </Badge>
      {/* right: nothing signed */}
      <Badge cx={750} cy={230} r={R} deg={50}>
        <rect x="-7" y="-2" width="14" height="11" rx="2" />
        <path d="M-4 -2V-5A4 4 0 0 1 4 -5V-2" />
      </Badge>
    </svg>
  );
}

/**
 * R30 (pin/707065210234626460, "Design Philosophy"): a hairline, then numbered lines 01–03 with the
 * number in a gutter; the active number is circled by hand (first line until you hover another).
 */
function Principles({ items, never }: { items: string[]; never?: boolean }) {
  return (
    <ol className="lp-principles mx-auto w-full max-w-[400px] border-white/[.14] border-t pt-5">
      {items.map((t, i) => (
        <li
          key={t}
          className="flex items-center gap-4 py-2.5 text-[15px] text-muted transition-colors hover:text-fg"
        >
          <span className="relative grid w-8 flex-none place-items-center font-mono text-[13px] text-dim">
            0{i + 1}
            <svg
              aria-hidden="true"
              viewBox="0 0 40 30"
              className="absolute -inset-x-1.5 -inset-y-1.5 overflow-visible"
              fill="none"
              stroke="var(--fg)"
              strokeWidth="1.2"
              strokeLinecap="round"
            >
              <path
                className="lp-circled"
                pathLength={1}
                d="M24 3C13 1 3 7 4 16C5 25 21 29 31 24C39 19 37 6 26 4C22 3 18 4 15 6"
              />
            </svg>
          </span>
          {never ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 10 10"
              className="size-2.5 flex-none"
              stroke="var(--red)"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M2 2L8 8M8 2L2 8" />
            </svg>
          ) : (
            <span className="mx-[3px] size-1.5 flex-none rounded-full bg-white" />
          )}
          {t}
        </li>
      ))}
    </ol>
  );
}

/**
 * R31 (pin/11962755257568023, "What we do"): the brand line as a big left-aligned title over a
 * full-width hairline, tiny labels under it, one statement line, the round action where R31 keeps
 * its "Services" button (here the Trace / Lab / Findings pill into the app).
 * Then R32's circle pair with R30's numbered lists under each circle.
 */
export function Statement() {
  const segments = [
    { label: "Trace", href: "/trace" },
    { label: "Lab", href: "/atlas", on: true },
    { label: "Findings", href: "/atlas" },
  ];
  const does = [
    "Reads forge test output and analyzer reports",
    "Decodes, maps and measures the code under review",
    "Writes tests of intended behaviour",
  ];
  const never = [
    "Writes exploits or attack payloads",
    "Sends transactions or signs anything",
    "Needs an RPC key or a live chain",
  ];
  return (
    <section
      data-tone="statement"
      className="mx-auto max-w-[1240px] px-4 pt-4 pb-28 md:px-6 md:pb-36"
    >
      <Reveal>
        <h2 className="text-[clamp(40px,7.4vw,104px)] text-fg leading-[0.98] tracking-[-0.045em]">
          Built for auditors.
          <br />
          <span className="text-white/40">Not for attackers.</span>
        </h2>
        <div className="mt-8 flex justify-between border-white/[.2] border-t pt-2 text-[12.5px] text-dim">
          <span>Stance</span>
          <span className="hidden md:inline">Read only</span>
          <span>Local files</span>
        </div>
        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <p className="max-w-[620px] text-[clamp(20px,2.2vw,28px)] text-fg leading-[1.3] tracking-[-0.01em]">
            Luora reads what your tests and analyzers already wrote, and lays it
            over the contract. It never touches a chain.
          </p>
          <nav
            aria-label="Open Luora"
            className="inline-flex gap-1 self-start rounded-full border border-white/[.08] bg-inset p-1"
          >
            {segments.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                  s.on
                    ? "bg-primary text-primary-fg"
                    : "text-muted hover:bg-hover hover:text-fg"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
      </Reveal>
      <Reveal delay={0.1} className="mx-auto mt-20 max-w-[1000px]">
        <Rings />
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[13px] text-dim md:sr-only">Reads</p>
            <Principles items={does} />
          </div>
          <div>
            <p className="mb-3 text-[13px] text-dim md:sr-only">Never</p>
            <Principles items={never} never />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const FAQ: [string, string][] = [
  [
    "What does Luora need to run?",
    "Node and Foundry. In your Foundry project, node luora-export.mjs runs forge test, decodes the traces with your own ABIs and writes luora-data.json; the app reads that file.",
  ],
  [
    "Where do Slither and Aderyn come in?",
    "Optional. Point the exporter at their JSON reports (reports/slither.json and reports/aderyn.json by default, or --slither= and --aderyn=) and their results merge into the findings.",
  ],
  [
    "Does my code leave my machine?",
    "The exporter and the app read local files. Triage status and notes are kept in your browser, per contract.",
  ],
  [
    "What does a Lab test check?",
    "Intended behaviour. You wire actors, calls, expected reverts and asserts; a failing assertion in the exported .t.sol is a finding to look at, not an attack.",
  ],
  [
    "Can I re-run a single test?",
    "Yes. node luora-export.mjs --mt test_x passes the filter through to forge, then reload the page.",
  ],
  [
    "Which contract does the atlas map?",
    "One per export. Set LUORA_ATLAS=<Contract> to pick it when a project has several.",
  ],
];

/** R8 (onorca.dev FAQ): heading left, quiet accordion right. Native <details>, no JS. */
export function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto grid max-w-[1240px] gap-10 px-4 pb-32 md:grid-cols-[5fr_7fr] md:px-6"
    >
      <Reveal>
        <h2 className="font-medium text-[clamp(32px,4.4vw,54px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Questions
          <br />
          <span className="text-white/45">auditors ask.</span>
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="border-white/[.07] border-t">
          {FAQ.map(([q, a]) => (
            <details
              key={q}
              className="group border-white/[.07] border-b py-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] text-fg">
                {q}
                <span className="grid size-7 flex-none place-items-center rounded-full border border-white/[.1] text-muted transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[560px] text-[14px] text-muted leading-relaxed">
                {a}
              </p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/**
 * R13 (ZERO) + R14 (SurveilTrack): the closing CTA and the footer share one full-bleed scene, a
 * glowing horizon carrying a dark city that rises with the scroll (FinaleRise, Genie's closing
 * clouds). R2 starburst stays above the headline.
 */
export function Finale() {
  return (
    <FinaleRise city={<CityHorizon />}>
      <FinalCta />
      <Footer />
    </FinaleRise>
  );
}

/** R8 (onorca.dev "Get Orca") + R2 (starburst): the two actions, no card, over the scene. */
export function FinalCta() {
  return (
    <div className="relative mx-auto max-w-[1240px] px-4 pt-28 pb-[clamp(200px,24vw,340px)] md:px-6 md:pt-36">
      {/* R13: hairlines with '+' markers framing the headline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[46%] hidden md:block"
      >
        <span className="absolute left-0 h-px w-[18%] bg-gradient-to-r from-transparent to-white/20" />
        <span className="absolute left-[18%] -mt-[4px] -ml-[4px] text-[10px] text-white/50 leading-none">
          +
        </span>
        <span className="absolute right-0 h-px w-[18%] bg-gradient-to-l from-transparent to-white/20" />
        <span className="absolute right-[18%] -mt-[4px] -mr-[4px] text-[10px] text-white/50 leading-none">
          +
        </span>
      </div>
      <div data-lp="finale-body" className="relative text-center">
        <div>
          <svg
            aria-hidden="true"
            viewBox="-40 -40 80 80"
            className="relative mx-auto mb-8 size-12"
            stroke="#fff"
            strokeWidth="2.5"
          >
            <g className="lp-breathe">
              <path d="M0-7V-34M0 7V34M-7 0H-34M7 0H34" />
              <path d="M6-6L19-19M-6 6L-19 19M-6-6L-19-19M6 6L19 19" />
            </g>
          </svg>
          <h2 className="relative font-light text-[clamp(36px,5.6vw,72px)] text-fg leading-[1.02] tracking-[-0.035em]">
            Open the sample vault.
          </h2>
          <p className="relative mx-auto mt-5 max-w-[460px] text-[16px] text-muted leading-relaxed">
            Everything on this page runs on it. Then point Luora at your own
            Foundry project.
          </p>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
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
          <p className="relative mt-8 font-mono text-[12px] text-dim">
            cd foundry && node luora-export.mjs
          </p>
        </div>
      </div>
    </div>
  );
}

/** R8 (onorca.dev footer): brand line left, link columns right, hairline top. */
export function Footer() {
  const cols = [
    {
      title: "Product",
      links: [
        ["Trace", "/trace"],
        ["Lab", "/atlas"],
        ["Findings", "#findings"],
        ["Coverage", "#coverage"],
      ],
    },
    {
      title: "Project",
      links: [
        ["GitHub", GITHUB],
        ["Docs", DOCS],
        ["Issues", `${GITHUB}/issues`],
        ["FAQ", "#faq"],
      ],
    },
  ];
  return (
    <footer className="bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,.5)_40%)]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-6">
        <div>
          <span className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-medium text-[17px] text-fg">luora</span>
          </span>
          <p className="mt-4 max-w-[300px] text-[13px] text-dim leading-relaxed">
            Visual tooling for smart contract audits. Defensive by design.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-[13px] text-text">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-dim">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="transition-colors hover:text-fg">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1240px] justify-between px-4 pb-8 text-[12px] text-dim md:px-6">
        <span>© 2026 Luora</span>
        <span>Built for auditors.</span>
      </div>
    </footer>
  );
}
