"use client";

import { type CSSProperties, useState } from "react";
import type { AiQuestion, AtlasData, Piece } from "@/features/atlas/types";
import { aiAnswer, CHECKLIST } from "@/features/atlas/utils/ai";
import { pieceAtLine } from "@/features/atlas/utils/audit";
import {
  type AtlasModel,
  createAtlasModel,
} from "@/features/atlas/utils/model";
import { tokenize } from "@/features/trace/utils/highlight";
import { WINDOW } from "./AskDemo";

/* The Ask window's panes (AskDemo.tsx): their own chunk, with the atlas code they run on. */

const QUESTIONS: { q: AiQuestion; label: string; ask: string }[] = [
  { q: "explain", label: "Explain", ask: "Explain this line" },
  { q: "risks", label: "What to check", ask: "What should I check here?" },
  { q: "test", label: "Write a test", ask: "Write a test that pins this" },
];
const SEV = { high: "High", med: "Medium", low: "Low", info: "Info" } as const;

function findingsOf(model: AtlasModel, p: Piece) {
  return p.sys === "vulns"
    ? [p]
    : model.findings.filter((f) => (f.links ?? []).includes(p.id));
}

type Block =
  | { k: "h"; t: string }
  | { k: "p"; t: string }
  | { k: "li"; t: string }
  | { k: "f"; t: string; risk: Piece["risk"] }
  | { k: "code"; t: string };

/** The answer as blocks, built from the same data and text as the app's aiAnswer. */
function blocks(model: AtlasModel, p: Piece, q: AiQuestion): Block[] {
  const out: Block[] = [];
  if (q === "explain") {
    const [lead, ...rest] = aiAnswer(model, p, q)
      .split("\n\n")
      .filter((t) => t.trim());
    out.push({ k: "p", t: lead });
    for (const r of rest)
      if (r.startsWith("Connected to: ")) {
        out.push({ k: "h", t: "Connected to" });
        for (const c of r.slice(14).replace(/\.$/, "").split(", "))
          out.push({ k: "li", t: c });
      } else out.push({ k: "p", t: r });
  } else if (q === "risks") {
    out.push({ k: "h", t: "Checklist" });
    for (const c of CHECKLIST[p.sys]) out.push({ k: "li", t: c });
    const fs = findingsOf(model, p);
    out.push({
      k: "h",
      t: fs.length ? "Open findings here" : "No open findings here",
    });
    for (const f of fs.slice(0, 4))
      out.push({ k: "f", t: f.name.replace(/^F-\d+\s*/, ""), risk: f.risk });
  } else {
    const text = aiAnswer(model, p, q);
    const at = text.search(/\n(?=\/\/|function )/);
    out.push({ k: "p", t: at > 0 ? text.slice(0, at).trim() : text });
    if (at > 0) out.push({ k: "code", t: text.slice(at + 1) });
  }
  return out;
}

/** the two panes: the contract lines and the assistant answering about the clicked one */
export function Panes({ atlas }: { atlas: AtlasData }) {
  const model = createAtlasModel(atlas);
  const host =
    model.pieces
      .filter((p) => p.sys === "entry")
      .sort(
        (a, b) => findingsOf(model, b).length - findingsOf(model, a).length,
      )[0] ?? model.pieces[0];
  const start = Math.max(0, model.lineOf(host) - 1);
  const lines = model.lines
    .slice(start, start + WINDOW)
    .map((text, i) => ({ n: start + i, text }));
  /** finding count per line (anchor + marked offsets), shown as inline diagnostics (R17) */
  const diag = new Map<number, number>();
  for (const f of model.findings)
    for (const o of f.mark ?? [0]) {
      const n = model.lineOf(f) + o;
      diag.set(n, (diag.get(n) ?? 0) + 1);
    }
  const meaningful = (n: number) => /[A-Za-z]/.test(model.lines[n] ?? "");
  const first =
    lines.find((l) => diag.has(l.n) && meaningful(l.n))?.n ??
    model.lineOf(host);

  const [line, setLine] = useState(first);
  const [q, setQ] = useState<AiQuestion>("risks");
  const id = pieceAtLine(model, line);
  const piece = id ? model.byId[id] : null;
  const answer = piece ? blocks(model, piece, q) : [];
  const ask = QUESTIONS.find((x) => x.q === q);
  const linked = piece ? findingsOf(model, piece).length : 0;

  // two inner panes 8px inside the window (DESIGN: 20 outer → 12 inner)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 px-2 pb-2 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* code: click a line; R18 accent bar on the selection, R17 inline diagnostics */}
      <ol className="rounded-inner border border-white/[.05] bg-[#0b0b0d] py-3 font-mono text-[12.5px] leading-[2.05]">
        {lines.map((l) => {
          const on = l.n === line;
          const owner = pieceAtLine(model, l.n);
          const d = diag.get(l.n);
          return (
            <li key={l.n}>
              <button
                type="button"
                disabled={!owner || !meaningful(l.n)}
                onClick={() => setLine(l.n)}
                className={`relative flex w-full items-center gap-4 px-4 text-left transition-colors disabled:cursor-default ${
                  on ? "bg-white/[.05]" : "enabled:hover:bg-white/[.025]"
                }`}
              >
                {on && (
                  <span className="absolute inset-y-0 left-0 w-[2px] bg-white" />
                )}
                <span className="w-6 shrink-0 text-right text-white/20">
                  {l.n + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate whitespace-pre ${on ? "text-white" : "text-white/55"}`}
                >
                  {/* only the selected line is highlighted, the rest is plain text */}
                  {on
                    ? tokenize(l.text).map((t, k) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: tokens of one static line
                          key={k}
                          className={t.type !== "plain" ? `tok-${t.type}` : ""}
                        >
                          {t.text}
                        </span>
                      ))
                    : l.text}
                </span>
                {d && (
                  <span className="shrink-0 rounded-md bg-red/[.12] px-1.5 font-sans text-[10.5px] text-red leading-[18px]">
                    ▲ {d}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* assistant panel, lit by one soft beam from the top (P6) */}
      <div className="relative flex h-[520px] min-w-0 flex-col overflow-hidden rounded-inner border border-white/[.05] bg-[#0b0b0d] p-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[15%] -top-24 h-48 rounded-full bg-white/[.07] blur-[50px]"
        />
        {/* R16: the question as the user's bubble */}
        <div
          key={`ask:${line}:${q}`}
          className="lp-ans relative ml-auto max-w-[88%] rounded-2xl rounded-br-md border border-white/[.06] bg-white/[.07] px-3.5 py-2 text-[13px] text-fg"
        >
          {ask?.ask}
          <span className="text-white/40"> · L{line + 1}</span>
        </div>

        {/* R17: a thinking row showing what the line resolved to */}
        {piece && (
          <p className="relative mt-4 flex flex-wrap items-center gap-x-1.5 text-[12px] text-dim">
            <span className="size-1.5 rounded-full bg-white/50" />
            Mapped L{line + 1} to
            <span className="font-mono text-white/70">{piece.name}</span>·{" "}
            {piece.sys}
            {linked > 0 && ` · ${linked} finding${linked > 1 ? "s" : ""}`}
          </p>
        )}

        <div
          key={`${line}:${q}`}
          className="lp-scroll relative mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-[13.5px] text-body leading-relaxed"
        >
          {answer.map((b, i) => {
            const key = `${i}:${b.t.slice(0, 24)}`;
            /* lp-ans: each block rises out of a blur after the one before it */
            const a = {
              style: { "--i": i + 1 } as CSSProperties,
            };
            if (b.k === "h")
              return (
                <p
                  key={key}
                  {...a}
                  className="lp-ans pt-2 font-medium text-[12.5px] text-fg"
                >
                  {b.t}
                </p>
              );
            if (b.k === "li")
              return (
                <p key={key} {...a} className="lp-ans flex gap-2 text-white/70">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-white/30" />
                  {b.t}
                </p>
              );
            if (b.k === "f")
              return (
                <p
                  key={key}
                  {...a}
                  className="lp-ans flex items-start gap-2 rounded-lg border border-white/[.05] bg-white/[.03] px-2.5 py-1.5 text-white/80"
                >
                  <span
                    className={`mt-[3px] shrink-0 rounded px-1.5 text-[10.5px] leading-[16px] ${b.risk === "high" || b.risk === "med" ? "bg-red/[.14] text-red" : "bg-white/[.08] text-muted"}`}
                  >
                    {SEV[b.risk ?? "low"]}
                  </span>
                  {b.t}
                </p>
              );
            if (b.k === "code")
              return (
                <pre
                  key={key}
                  {...a}
                  className="lp-ans whitespace-pre-wrap break-words rounded-lg border border-white/[.06] bg-black/50 p-3 font-mono text-[11.5px] text-white/75 leading-relaxed"
                >
                  {b.t}
                </pre>
              );
            return (
              <p
                key={key}
                {...a}
                className="lp-ans whitespace-pre-wrap break-words"
              >
                {b.t}
              </p>
            );
          })}
        </div>

        {/* R17 prompt bar: the line as a context chip, the three questions as tiles */}
        <div className="lp-glass relative mt-3 rounded-xl p-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[.06] px-2 py-0.5 font-mono text-[11px] text-white/70">
            L{line + 1} · {piece?.name ?? "—"}
          </span>
          <div className="mt-2 flex flex-wrap gap-1">
            {QUESTIONS.map((x) => (
              <button
                key={x.q}
                type="button"
                onClick={() => setQ(x.q)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                  q === x.q
                    ? "bg-white text-black"
                    : "text-dim hover:bg-white/[.05] hover:text-fg"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
