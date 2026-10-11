import Link from "next/link";
import { LogoText } from "@/components/ui";
import { CityHorizon } from "./CityHorizon";
import { CompareWorlds } from "./CompareTable";
import { compareData } from "./compare-data";
import { GitHubMark } from "./GitHubMark";
import { FinaleRise } from "./Haze";
import { DOCS, GITHUB } from "./Hero";
import { Reveal } from "./motion";

/**
 * Twelfth pass (C1–C3 in CompareTable.tsx, index.ts): an editorial title over three rows, each one
 * two worlds, the raw text forge and the analyzer CLIs print beside the same run as Luora renders
 * it, a lit seam wiping from one to the other with the scroll; on wide screens the block pins and
 * the rows take turns (CompareTable staged()).
 */
export async function Compare() {
  const data = await compareData();
  return (
    <section
      data-tone="compare"
      className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6"
    >
      {/* no Exit wrapper here: its transform would make the stage's position:fixed pin scroll */}
      <CompareWorlds data={data} />
    </section>
  );
}

/** the filter tabs; `all` shows every question */
const CATS = [
  ["all", "All questions"],
  ["setup", "Setup"],
  ["findings", "Findings & Lab"],
  ["privacy", "Privacy"],
] as const;
type Cat = Exclude<(typeof CATS)[number][0], "all">;

const FAQ: [Cat, string, string][] = [
  [
    "setup",
    "What does Luora need to run?",
    "Node and Foundry. In your Foundry project, node luora-export.mjs runs forge test, decodes the traces with your own ABIs and writes luora-data.json; the app reads that file.",
  ],
  [
    "findings",
    "Where do Slither and Aderyn come in?",
    "Optional. Point the exporter at their JSON reports (reports/slither.json and reports/aderyn.json by default, or --slither= and --aderyn=) and their results merge into the findings.",
  ],
  [
    "privacy",
    "Does my code leave my machine?",
    "The exporter and the app read local files. Triage status and notes are kept in your browser, per contract.",
  ],
  [
    "findings",
    "What does a Lab test check?",
    "Intended behaviour. You wire actors, calls, expected reverts and asserts; a failing assertion in the exported .t.sol is a finding to look at, not an attack.",
  ],
  [
    "setup",
    "Can I re-run a single test?",
    "Yes. node luora-export.mjs --mt test_x passes the filter through to forge, then reload the page.",
  ],
  [
    "setup",
    "Which contract does the atlas map?",
    "One per export. Set LUORA_ATLAS=<Contract> to pick it when a project has several.",
  ],
];

/**
 * F1 pin/310255861851860168 ('FAQ1', Fora 'Answers to the questions that come up most'): a small
 * FAQ pill over the heading, a short line to its right; below, a card of category tabs on the
 * left with a 'Got questions?' card at its foot, and the questions as separate rounded cards on
 * the right, each with a chevron in a ring. Still no JS: the tabs are radios, the filter is CSS
 * (landing.css .lp-faq), every question a native <details> whose body eases open and shut
 * (::details-content height + the answer fading in, CSS only).
 */
export function Faq() {
  return (
    <section
      id="faq"
      data-tone="faq"
      className="lp-faq mx-auto max-w-[1240px] px-4 pb-32 md:px-6"
    >
      <Reveal className="grid gap-5 md:grid-cols-2 md:items-end md:gap-10">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-[12px] text-muted">
            <span className="size-1.5 rounded-full bg-white/60" />
            FAQ
          </p>
          {/* F1: a regular-weight, one-tone two-line title, as the ref sets it */}
          <h2 className="max-w-[560px] font-normal text-[clamp(30px,3.4vw,46px)] text-fg leading-[1.12] tracking-[-0.025em]">
            Answers to the questions auditors ask most.
          </h2>
        </div>
        <p className="max-w-[400px] text-[15px] text-muted leading-relaxed md:justify-self-end">
          How Luora runs, what it reads from your Foundry project and what stays
          on your machine.
        </p>
      </Reveal>

      <Reveal
        delay={0.08}
        className="mt-10 grid gap-3 md:mt-14 md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-4"
      >
        {/* F1: the category tabs (radios, so the filter needs no JS) */}
        <fieldset className="grid grid-cols-2 gap-1 rounded-[16px] border border-white/[.07] bg-[#0e0e10] p-1.5 md:flex md:flex-col">
          <legend className="sr-only">Filter the questions</legend>
          {CATS.map(([id, label]) => (
            <label
              key={id}
              className="flex h-10 cursor-pointer items-center justify-center rounded-[11px] px-3 text-[13.5px] text-muted transition-colors hover:text-fg has-[:checked]:bg-gradient-to-b has-[:checked]:from-white/[.09] has-[:checked]:to-white/[.04] has-[:checked]:text-fg has-[:checked]:shadow-[inset_0_1px_0_rgba(255,255,255,.08)] has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-white/30"
            >
              <input
                type="radio"
                name="faq-cat"
                value={id}
                defaultChecked={id === "all"}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>

        {/* F1: every question its own rounded card, a chevron in a ring */}
        <div className="space-y-2.5 md:col-start-2 md:row-span-2 md:row-start-1">
          {FAQ.map(([cat, q, a]) => (
            <details
              key={q}
              data-cat={cat}
              className="group rounded-[16px] border border-white/[.07] bg-gradient-to-b from-[#151517] to-[#0f0f11] px-5 transition-colors hover:border-white/[.12] open:border-white/[.12] md:px-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex min-h-[62px] cursor-pointer list-none items-center justify-between gap-6 py-3 text-[15px] text-fg md:text-[16px]">
                {q}
                <span className="grid size-8 flex-none place-items-center rounded-full border border-white/[.1] bg-white/[.03] text-muted transition-transform duration-300 group-open:rotate-180">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-[600px] pb-5 text-[14px] text-muted leading-relaxed">
                {a}
              </p>
            </details>
          ))}
        </div>

        {/* F1: 'Got questions?' at the foot of the left column */}
        <div className="rounded-[16px] border border-white/[.07] bg-[#0e0e10] p-5 md:col-start-1 md:row-start-2 md:self-end">
          <p className="text-[17px] text-fg">Not answered here?</p>
          <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
            Open an issue on the repository with the run and the contract you
            are looking at.
          </p>
          <a
            href={`${GITHUB}/issues`}
            className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-fg transition-colors hover:text-white"
          >
            Open an issue
            <span aria-hidden="true">→</span>
          </a>
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
    <FinaleRise city={<CityHorizon />} footer={<Footer />}>
      <FinalCta />
    </FinaleRise>
  );
}

/** R8 (onorca.dev "Get Orca") + R2 (starburst): the two actions, no card, over the scene. */
export function FinalCta() {
  return (
    <div className="relative mx-auto max-w-[1240px] px-4 pt-28 pb-[330px] md:px-6 md:pt-36 md:pb-[clamp(200px,24vw,340px)]">
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
          {/* the breathing runs on the <svg> box itself (not an inner <g>), so it stays on the
              compositor: no style / layout pass every frame while the finale is on screen */}
          <svg
            aria-hidden="true"
            viewBox="-40 -40 80 80"
            className="lp-breathe relative mx-auto mb-8 size-12"
            stroke="#fff"
            strokeWidth="2.5"
          >
            <path d="M0-7V-34M0 7V34M-7 0H-34M7 0H34" />
            <path d="M6-6L19-19M-6 6L-19 19M-6-6L-19-19M6 6L19 19" />
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
              Open the Atlas
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
        ["Atlas", "/atlas"],
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
            <LogoText height={28} />
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
