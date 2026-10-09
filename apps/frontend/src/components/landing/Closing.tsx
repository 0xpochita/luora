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
 * Twelfth pass (C1–C3 in CompareTable.tsx, index.ts): an editorial title over eight rows, each one
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
      data-tone="faq"
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
