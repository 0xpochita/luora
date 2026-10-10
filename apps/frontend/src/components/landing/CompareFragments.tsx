"use client";

import type { ReactNode } from "react";
import { Chip, tile } from "@/components/ui";
import type { CompareData } from "./compare-data";

/*
 * The Luora side of Compare's two worlds: one small, real fragment of the app per row (three), drawn from
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

/** 1 (traces): the frames, decoded: depth, kind, Contract.fn, named arguments, the line that made the call */
function Calls({ d }: { d: CompareData }) {
  return (
    <>
      <Head title="Trace" aside={d.test} />
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

/**
 * 2 (findings): the two reports (quoted in CompareTable's raw side) wired into the one finding the exporter
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

/** 3 (tests): the Lab scenario as its chain of cards, run, and the .t.sol it exports */
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

const PARTS = [Calls, Merged, Scenario];

export function Fragment({ i, data }: { i: number; data: CompareData }) {
  const Part = PARTS[i];
  return <Part d={data} />;
}
