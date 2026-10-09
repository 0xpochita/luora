"use client";

import type { ReactNode } from "react";
import { Chip, Meter, tile } from "@/components/ui";
import type { CompareData } from "./compare-data";

/*
 * The Luora side of Compare's two worlds: one small, real fragment of the app per row, drawn from
 * the sample run (compare-data.ts) in the app's own parts (Chip, Meter, tiles, graphite cards,
 * semantic dots). Mounted only near the screen (Lazy in CompareTable). Read-only pictures: the
 * row's copy carries the words, so these stay aria-hidden.
 */

/** white dot + title, dim aside: the panel head every fragment shares (DESIGN.md card title) */
function Head({ title, aside }: { title: string; aside?: string }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[13px] text-fg">
      <span className="size-1.5 rounded-full bg-white" />
      {title}
      {aside ? (
        <span className="ml-auto truncate pl-3 font-mono text-[11.5px] text-dim">
          {aside}
        </span>
      ) : null}
    </p>
  );
}

function Inner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-inner border border-white/[.07] bg-inner-grad p-3">
      {children}
    </div>
  );
}

const KIND = { call: "→", static: "◇", event: "◆" } as const;

/** 1: the frames, decoded: depth, kind, Contract.fn, named arguments, the line that made the call */
function Calls({ d }: { d: CompareData }) {
  return (
    <>
      <Head title="Trace" aside={d.graph.test} />
      <Inner>
        {d.calls.map((c, i) => (
          <p
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed frame order
            key={i}
            className="flex h-[26px] items-center gap-2 text-[12.5px]"
            style={{ paddingLeft: c.d * 14 }}
          >
            <span className="w-3 text-center text-[11px] text-muted">
              {KIND[c.kind]}
            </span>
            <span className={c.kind === "event" ? "text-muted" : "text-fg"}>
              {c.name}
            </span>
            <span className="truncate font-mono text-[11px] text-dim">
              {c.args.replaceAll("=", " ")}
            </span>
            <span className="ml-auto pl-2 font-mono text-[11px] text-dim">
              {c.at}
            </span>
          </p>
        ))}
      </Inner>
    </>
  );
}

/** 2 and 3: the frame's function, lit where it ran; with `ops`, its slot reads / writes per line */
function Source({ d, ops }: { d: CompareData; ops?: boolean }) {
  const f = d.frame;
  return (
    <>
      <Head title={ops ? "Storage" : "Source"} aside={`${f.file}`} />
      <Inner>
        {ops ? null : (
          <p className="mb-2 flex items-center gap-2 text-[12.5px] text-text">
            <Chip dot tone="ok">
              {f.head}
            </Chip>
            <span className="whitespace-nowrap font-mono text-[11px] text-dim max-sm:hidden">
              {f.gas.toLocaleString("en-US")} gas
            </span>
          </p>
        )}
        {f.lines.map((l) => (
          <p
            key={l.n}
            className={`flex h-[22px] items-center gap-3 rounded-[6px] px-1 font-mono text-[11.5px] ${l.ran ? "bg-white/[.045] text-fg" : "text-dim"}`}
          >
            <span className="w-6 flex-none text-right text-dim">{l.n}</span>
            <span className="truncate whitespace-pre">{l.code}</span>
            {ops && l.ops.length ? (
              <span className="ml-auto flex gap-1">
                {l.ops.map((op, j) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: ops in run order
                    key={j}
                    className={`rounded-[5px] px-1.5 text-[10.5px] leading-[17px] ${op === "SSTORE" ? "bg-white/[.14] text-fg" : "bg-raised text-muted"}`}
                  >
                    {op === "SSTORE" ? "write" : "read"}
                  </span>
                ))}
              </span>
            ) : null}
          </p>
        ))}
      </Inner>
    </>
  );
}

/** 4: who calls whom, the test on top and one row per call depth, 1px wire beziers (DESIGN.md) */
function Graph({ d }: { d: CompareData }) {
  const W = 400;
  const ROW = 56;
  const pos = new Map<string, { x: number; y: number; w: number }>();
  for (const [r, row] of d.graph.nodes.entries()) {
    const slot = W / row.length;
    const w = Math.min(slot - 8, r ? 112 : 190);
    for (const [c, n] of row.entries())
      pos.set(n, { x: slot * c + (slot - w) / 2, y: r * ROW, w });
  }
  const H = (d.graph.nodes.length - 1) * ROW + 34;
  return (
    <>
      <Head title="Call graph" aside={`${pos.size - 1} functions`} />
      <Inner>
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
        >
          {d.graph.edges.map(([a, b]) => {
            const p = pos.get(a);
            const q = pos.get(b);
            if (!p || !q) return null;
            const x1 = p.x + p.w / 2;
            const x2 = q.x + q.w / 2;
            const y1 = p.y + 34;
            const mid = (y1 + q.y) / 2;
            return (
              <path
                key={`${a}>${b}`}
                d={`M${x1} ${y1}C${x1} ${mid} ${x2} ${mid} ${x2} ${q.y}`}
                fill="none"
                stroke="#7d7d84"
                strokeWidth="1"
              />
            );
          })}
          {[...pos].map(([n, p], i) => {
            const dot = n.lastIndexOf(".");
            return (
              <g key={n} transform={`translate(${p.x} ${p.y})`}>
                <rect
                  width={p.w}
                  height="34"
                  rx="9"
                  fill={i ? "#252528" : "#f4f4f5"}
                  stroke="rgba(255,255,255,.1)"
                />
                <text
                  x={p.w / 2}
                  y="15"
                  textAnchor="middle"
                  fontSize="11.5"
                  fill={i ? "#e6e6e8" : "#0e0e10"}
                >
                  {n.slice(dot + 1)}
                </text>
                <text
                  x={p.w / 2}
                  y="27"
                  textAnchor="middle"
                  fontSize="9"
                  fill={i ? "#6f6f76" : "#52525b"}
                >
                  {i ? n.slice(0, dot) : "forge test"}
                </text>
              </g>
            );
          })}
        </svg>
      </Inner>
    </>
  );
}

/**
 * 5: the two reports (quoted in CompareTable's raw side) wired into the one finding the exporter
 * makes of them: luora-findings.mjs class 'reentrancy', its title, severity the worse of the two.
 */
function Merged(_: { d: CompareData }) {
  const tools = [
    ["Slither", "reentrancy-no-eth"],
    ["Aderyn", "reentrancy-state-change"],
  ];
  return (
    <>
      <Head title="Findings" aside="2 reports → 1 finding" />
      <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1.3fr)] items-center">
        <div className="space-y-2">
          {tools.map(([t, det]) => (
            <p
              key={t}
              className="rounded-tile border border-white/[.07] bg-raised px-2.5 py-1.5 text-[12px] text-text"
            >
              {t}
              <span className="block truncate font-mono text-[10.5px] text-dim">
                {det}
              </span>
            </p>
          ))}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 40 80"
          className="h-20 w-10"
          fill="none"
        >
          <path
            d="M0 18C22 18 18 40 40 40M0 62C22 62 18 40 40 40"
            stroke="#7d7d84"
          />
        </svg>
        <Inner>
          <p className="flex items-center gap-2 text-[12.5px] text-fg">
            <span className="size-1.5 flex-none rounded-full bg-red" />
            State change after external call (reentrancy)
          </p>
          <p className="mt-2.5 flex flex-wrap gap-1.5">
            <Chip dot tone="bad">
              High
            </Chip>
            <Chip>Slither + Aderyn</Chip>
          </p>
        </Inner>
      </div>
    </>
  );
}

const DOT = { high: "bg-red", med: "bg-yellow", low: "bg-dim", info: "bg-dim" };

/** 6: the findings with their triage control (every finding starts Open), then the report */
function Triage({ d }: { d: CompareData }) {
  return (
    <>
      <Head
        title="Triage"
        aside={`${d.findings.length} of ${d.findings.length} open`}
      />
      <Inner>
        {d.findings.map((f, i) => (
          <div
            key={f.title}
            className="flex h-8 items-center gap-2 text-[12.5px]"
          >
            <span
              className={`size-1.5 flex-none rounded-full ${DOT[f.risk as keyof typeof DOT] ?? "bg-dim"}`}
            />
            <span className="truncate text-fg">{f.title}</span>
            <span className="text-[11.5px] text-dim">{f.label}</span>
            <span className="ml-auto flex flex-none gap-1">
              {(i ? ["Open"] : ["Open", "Confirmed", "False positive"]).map(
                (s, j) => (
                  <span
                    key={s}
                    className={`${tile(!j)} h-6 px-2 text-[11.5px] ${j ? "max-sm:hidden" : ""}`}
                  >
                    {s}
                  </span>
                ),
              )}
            </span>
          </div>
        ))}
      </Inner>
      <p className="mt-3 flex items-center gap-3">
        <span className={`${tile(false)} h-7 px-3 text-[12px]`}>
          Export report
        </span>
        <span className="truncate font-mono text-[11px] text-dim">
          # {d.contract} — audit findings
        </span>
      </p>
    </>
  );
}

/** 7: coverage per entry point, untested first (coverageFocus order) */
function Coverage({ d }: { d: CompareData }) {
  return (
    <>
      <Head title="Coverage" aside="untested first" />
      <Inner>
        {d.fns.map((f) => (
          <p key={f.name} className="flex h-8 items-center gap-3 text-[12.5px]">
            <span className="w-40 truncate font-mono text-[11.5px] text-fg">
              {f.name}
            </span>
            <Meter value={f.pct} className="w-28" />
            <span className="w-16 text-right font-mono text-[11.5px] text-muted">
              {f.pct ? `${Math.round(f.pct * 100)}%` : "untested"}
            </span>
          </p>
        ))}
      </Inner>
    </>
  );
}

/** 8: the Lab scenario as its chain of cards, run, and the .t.sol it exports */
function Scenario({ d }: { d: CompareData }) {
  return (
    <>
      <Head
        title="Lab scenario"
        aside={`run · ${d.scenario.every((n) => n.ok) ? "pass" : "fail"}`}
      />
      <div className="flex flex-wrap items-center gap-y-2">
        {d.scenario.map((n, i) => (
          <span key={n.title} className="flex items-center">
            {i ? <span className="h-px w-4 bg-[#7d7d84]" /> : null}
            <Chip
              dot
              tone={n.ok ? "ok" : "bad"}
              className="h-7 border border-white/[.08]"
            >
              {n.title}
            </Chip>
          </span>
        ))}
      </div>
      <div className="mt-3">
        <Inner>
          <p className="flex items-center gap-2 text-[12.5px] text-text">
            <span className="font-mono text-[11.5px]">{d.sol.file}</span>
            <span className={`${tile(true)} ml-auto h-6 px-2.5 text-[11.5px]`}>
              Export .t.sol
            </span>
          </p>
        </Inner>
      </div>
    </>
  );
}

const PARTS = [
  Calls,
  Source,
  ({ d }: { d: CompareData }) => <Source d={d} ops />,
  Graph,
  Merged,
  Triage,
  Coverage,
  Scenario,
];

export function Fragment({ i, data }: { i: number; data: CompareData }) {
  const Part = PARTS[i];
  return <Part d={data} />;
}
