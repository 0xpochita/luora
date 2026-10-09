"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PieceIcon } from "@/components/(main)/atlas/PieceIcon";
import { ICON_PATH, iconOf, SYSTEMS } from "@/features/atlas";
import type { AtlasData } from "@/features/atlas/types";
import { linesOf, SEVERITY } from "@/features/atlas/utils/audit";
import { hitLabel } from "@/features/atlas/utils/coverage";
import { flowLayout } from "@/features/atlas/utils/flow-layout";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { unitCode } from "@/features/atlas/utils/units";
import { tokenize } from "@/features/trace/utils/highlight";
import { Lazy } from "./motion";

/**
 * Bento mini-UIs drawn live from the sample run, where a capture of the app had to be cropped
 * (seventh pass: the Source panel ran off the right, Flow lanes were cut, Quick search carried the
 * page behind it). Same data and the same parts as the app (PieceIcon, iconOf, flowLayout,
 * coverage hits); each sits in a Fit box that scales it down to the card, so it is never cut.
 */
export type MiniKind = "source" | "flow" | "search";

/** scales its child down (never up) until it fits the box, centred */
function Fit({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const b = box.current;
    const c = inner.current;
    if (!b || !c) return;
    const fit = () =>
      setK(
        Math.min(
          1,
          b.clientWidth / c.offsetWidth,
          b.clientHeight / c.offsetHeight,
        ),
      );
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative size-full min-h-0 min-w-0">
      <div
        ref={inner}
        className="absolute top-1/2 left-1/2 w-max"
        style={{ transform: `translate(-50%, -50%) scale(${k})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** the panel chrome every mini UI shares: graphite card, white dot + title, dim aside */
function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-white/[.08] bg-card-grad p-1.5 shadow-float">
      <p className="flex items-center gap-2 px-2.5 pt-1.5 pb-2 text-[13px] text-fg">
        <span className="size-1.5 rounded-full bg-white" />
        {title}
        {aside && (
          <span className="ml-auto pl-6 font-mono text-[11.5px] text-dim">
            {aside}
          </span>
        )}
      </p>
      <div className="rounded-[10px] border border-white/[.05] bg-inner-grad">
        {children}
      </div>
    </div>
  );
}

type Model = ReturnType<typeof createAtlasModel>;

/** Source: the worst finding's function, its marked lines red, forge coverage hits in the gutter. */
function MiniSource({ model }: { model: Model }) {
  const f = model.findings[0];
  const host =
    (f?.links ?? [])
      .map((id) => model.byId[id])
      .find((p) => p?.sys === "entry") ?? f;
  if (!host) return null;
  const lines = linesOf(model, host).slice(0, 8);
  const bad = new Set(
    model.findings.flatMap((x) =>
      (x.mark ?? [0]).map((m) => model.lineOf(x) + m),
    ),
  );
  const hits = model.coverage?.hits;
  return (
    <Panel
      title="Source"
      aside={`${model.file.split("/").pop()} L${lines[0] + 1}–${lines[lines.length - 1] + 1}`}
    >
      {f && (
        <p className="px-3 pt-2.5 pb-1.5 font-mono text-[11.5px] text-text">
          {f.name}
        </p>
      )}
      <ol className="pb-2 font-mono text-[11.5px] leading-[1.95]">
        {lines.map((n) => (
          <li
            key={n}
            className={`flex gap-3 pr-4 ${bad.has(n) ? "bg-red/[.08] shadow-[inset_2px_0_0_var(--red)]" : ""}`}
          >
            <span className="w-8 text-right text-white/25">{n + 1}</span>
            <span className="w-8 text-right text-dim/80">
              {hits?.[n] == null ? "" : hits[n] ? hitLabel(hits[n]) : "0"}
            </span>
            <span className="whitespace-pre text-white/80">
              {tokenize(model.lines[n] ?? "").map((t, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: tokens of one static line
                  key={i}
                  className={t.type === "plain" ? "" : `tok-${t.type}`}
                >
                  {t.text}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Flow: the first entry points as lanes of their steps in order; red ring = written after a call. */
function MiniFlow({ model }: { model: Model }) {
  const lanes = flowLayout(model).lanes.slice(0, 4);
  const R = 11;
  const DX = 34;
  const LW = 150;
  const H = 46;
  const n = Math.max(...lanes.map((l) => l.nodes.length));
  const W = LW + n * DX + 12;
  return (
    <Panel title="Flow" aside={`${lanes.length} entry points`}>
      <svg
        viewBox={`0 0 ${W} ${lanes.length * H + 8}`}
        width={W}
        height={lanes.length * H + 8}
        className="block"
        role="img"
        aria-label="Entry points as the order of their checks, reads, calls and writes"
      >
        {lanes.map((l, li) => {
          const y = 4 + li * H + H / 2;
          const last = LW + (l.nodes.length - 1) * DX;
          return (
            <g key={l.id}>
              <text
                x="12"
                y={y + 4}
                fill="var(--text)"
                fontSize="12"
                fontFamily="var(--font-geist-mono)"
              >
                {l.sig.length > 18 ? `${l.sig.slice(0, 17)}…` : l.sig}
              </text>
              <path
                d={`M${LW} ${y}H${last}`}
                stroke="var(--wire)"
                strokeOpacity="0.6"
              />
              {l.nodes.map((nd, i) => {
                const p = model.byId[nd.id];
                const icon =
                  nd.kind === "entry"
                    ? "plug"
                    : nd.kind === "ret"
                      ? "cycle"
                      : p
                        ? iconOf(p)
                        : "grid";
                const x = LW + i * DX;
                return (
                  <g key={nd.key} transform={`translate(${x} ${y})`}>
                    <circle
                      r={R}
                      fill="var(--raised)"
                      stroke={nd.late ? "var(--red)" : "#fff"}
                      strokeOpacity={nd.late ? 0.9 : 0.14}
                    />
                    <path
                      d={ICON_PATH[icon]}
                      transform="translate(-6 -6) scale(.5)"
                      fill="none"
                      stroke={nd.late ? "var(--red)" : "var(--port)"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

/** Quick search: what typing 'dep' lists, matched the way the app's QuickSearch matches. */
function MiniSearch({ model }: { model: Model }) {
  const hits = model.pieces
    .map((p) => ({
      p,
      code: unitCode(model, p.id),
      text:
        p.sys === "vulns"
          ? `${SEVERITY[p.risk ?? "low"]} · ${p.name.replace(/^F-\d+\s*/, "")}`
          : p.name,
    }))
    .filter((h) =>
      `${h.code} ${h.p.name} ${h.text} ${SYSTEMS[h.p.sys].label}`
        .toLowerCase()
        .includes("dep"),
    )
    .slice(0, 3);
  return (
    <div className="w-[440px] rounded-[16px] border border-white/[.1] bg-card-grad p-2 shadow-float">
      <p className="flex items-center rounded-inner border border-white/[.13] bg-field px-3 py-2 text-[13.5px] text-fg">
        dep
        <span className="lp-caret ml-px h-4 w-px bg-white/70" />
        <span className="ml-auto rounded-md bg-white/[.06] px-1.5 font-mono text-[11px] text-dim">
          ⌘K
        </span>
      </p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {hits.map((h, i) => (
          <li
            key={h.p.id}
            className={`grid grid-cols-[24px_56px_1fr_auto] items-center gap-2.5 rounded-tile px-2 py-1.5 text-[13px] ${i ? "text-muted" : "bg-hover text-fg"}`}
          >
            <PieceIcon piece={h.p} />
            <span className="font-mono text-[12px] text-fg">{h.code}</span>
            <span
              className={`truncate ${h.p.sys === "vulns" ? "text-red" : ""}`}
            >
              {h.text}
            </span>
            <span className="text-[12px] text-dim">
              {SYSTEMS[h.p.sys].label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** built only once its card comes near the screen (Lazy): the card box keeps its size meanwhile */
export function BentoMini(props: { atlas: AtlasData; kind: MiniKind }) {
  return (
    <Lazy className="size-full">
      <Mini {...props} />
    </Lazy>
  );
}

function Mini({ atlas, kind }: { atlas: AtlasData; kind: MiniKind }) {
  const model = useMemo(() => createAtlasModel(atlas), [atlas]);
  const ui =
    kind === "source" ? (
      <MiniSource model={model} />
    ) : kind === "flow" ? (
      <MiniFlow model={model} />
    ) : (
      <MiniSearch model={model} />
    );
  return <Fit>{ui}</Fit>;
}
