import Link from "next/link";
import { LogoMark } from "@/components/ui";
import { GitHubMark } from "./GitHubMark";
import { DOCS, GITHUB } from "./Hero";
import { Reveal } from "./motion";

const ROWS: [string, string][] = [
  ["Decoded calls, events and cheatcodes", "Text tree"],
  ["Source lines each frame executed", "Step debugger"],
  ["Storage reads and writes per line", "Step debugger"],
  ["Call graph per test", "—"],
  ["Slither and Aderyn merged per issue", "Two reports"],
  ["Triage status and Markdown report", "—"],
  ["Coverage per function, untested first", "Per-file table"],
  ["Wire a scenario, export a .t.sol", "By hand"],
];

/** R8 (onorca.dev "Built for agents, not retrofitted"): two-column heading, one quiet comparison table. */
export function Compare() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6">
      <Reveal className="mb-10 grid gap-6 md:grid-cols-2 md:items-end">
        <h2 className="font-medium text-[clamp(32px,4.4vw,54px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Same run,
          <br />
          <span className="text-white/45">read differently.</span>
        </h2>
        <p className="max-w-[460px] text-[16px] text-muted leading-relaxed md:justify-self-end">
          Luora does not replace forge or the analyzers. It reads what they
          already produce and lays it over the contract.
        </p>
      </Reveal>
      <Reveal>
        <table className="w-full overflow-hidden rounded-[20px] border border-white/[.07] bg-[#0c0c0d] text-left text-[14px]">
          <thead className="text-[13px] text-dim">
            <tr className="border-white/[.06] border-b">
              <th className="px-5 py-4 font-normal">What you get</th>
              <th className="w-[96px] px-3 py-4 text-center font-normal text-fg md:w-[140px]">
                Luora
              </th>
              <th className="w-[110px] px-3 py-4 text-center font-normal md:w-[200px]">
                forge + analyzer CLIs
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([what, cli]) => (
              <tr
                key={what}
                className="border-white/[.05] border-b transition-colors last:border-0 hover:bg-white/[.02]"
              >
                <td className="px-5 py-3.5 text-body">{what}</td>
                <td className="px-3 py-3.5 text-center text-fg">✓</td>
                <td className="px-3 py-3.5 text-center text-[13px] text-dim">
                  {cli}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}

/** Hairline radar behind the statement: rings, a slow sweep, a few blips (one red: a finding). */
function Radar() {
  const rings = [90, 170, 250, 330, 410];
  return (
    <svg
      aria-hidden="true"
      viewBox="-440 -440 880 880"
      className="pointer-events-none absolute top-1/2 left-1/2 size-[880px] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,#000_40%,transparent)]"
    >
      <defs>
        <linearGradient id="lp-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#fff" strokeOpacity="0.08">
        {rings.map((r) => (
          <circle key={r} r={r} />
        ))}
        <path d="M-430 0H430M0-430V430" strokeOpacity="0.05" />
      </g>
      <g className="lp-sweep">
        <path d="M0 0L410 0A410 410 0 0 0 290 -290Z" fill="url(#lp-sweep)" />
        <path d="M0 0L410 0" stroke="#fff" strokeOpacity="0.2" />
      </g>
      {[
        [-330, -90],
        [250, 240],
        [-180, 290],
        [360, 60],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="2.5" fill="#fff" fillOpacity="0.5" />
      ))}
      <circle cx="340" cy="-170" r="3" fill="var(--red)" />
      <circle
        cx="340"
        cy="-170"
        r="3"
        fill="none"
        stroke="var(--red)"
        className="lp-blip"
      />
    </svg>
  );
}

/** R6 (huge centred statement on black, segmented pill) + a radar of hairline rings for depth. */
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
    <section className="relative overflow-hidden py-28 md:py-40">
      <Radar />
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center px-4 text-center md:px-6">
        <Reveal>
          <h2 className="text-[clamp(40px,7.4vw,104px)] text-fg leading-[0.98] tracking-[-0.045em]">
            Built for auditors.
            <br />
            <span className="text-white/40">Not for attackers.</span>
          </h2>
        </Reveal>
        <Reveal
          delay={0.1}
          className="mt-14 grid w-full max-w-[760px] gap-3 text-left md:grid-cols-2"
        >
          {[
            { title: "Luora does", items: does, dot: "bg-white" },
            { title: "Luora never", items: never, dot: "bg-red" },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-[18px] border border-white/[.07] bg-[#0a0a0b]/85 p-5"
            >
              <p className="flex items-center gap-2 text-[13px] text-text">
                <span className={`size-1.5 rounded-full ${c.dot}`} />
                {c.title}
              </p>
              <ul className="mt-3 space-y-2 text-[14px] text-muted">
                {c.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
        <nav
          aria-label="Open Luora"
          className="mt-10 inline-flex gap-1 rounded-full border border-white/[.08] bg-inset p-1"
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

/** R8 (onorca.dev "Get Orca") + R2 (starburst) + R1 (beam): one closing card with the two actions. */
export function FinalCta() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-24 md:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[#0a0a0b] px-6 py-20 text-center md:py-28">
          <div
            aria-hidden="true"
            className="lp-beam pointer-events-none absolute -top-10 left-1/2 h-[420px] w-[520px] -translate-x-1/2"
          />
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
      </Reveal>
    </section>
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
    <footer className="border-white/[.07] border-t">
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
