"use client";

import { useEffect, useState } from "react";
import type { AiQuestion, AtlasData } from "@/features/atlas/types";
import { aiAnswer } from "@/features/atlas/utils/ai";
import { pieceAtLine } from "@/features/atlas/utils/audit";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { tokenize } from "@/features/trace/utils/highlight";

const QUESTIONS: { q: AiQuestion; label: string }[] = [
  { q: "explain", label: "Explain" },
  { q: "risks", label: "What to check" },
  { q: "test", label: "Write a test" },
];
const WINDOW = 13;

/** Streams `text` in, a few characters per frame; instant when the user prefers less motion. */
function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    setN(0);
    let raf = 0;
    const tick = () => {
      setN((v) => {
        if (v >= text.length) return v;
        raf = requestAnimationFrame(tick);
        return Math.min(text.length, v + 6);
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return text.slice(0, n);
}

export function AskDemo({ atlas }: { atlas: AtlasData }) {
  const model = createAtlasModel(atlas);
  // open on the function with the most findings, at its first flagged line
  const host =
    model.pieces
      .filter((p) => p.sys === "entry")
      .sort(
        (a, b) =>
          model.findings.filter((f) => f.links?.includes(b.id)).length -
          model.findings.filter((f) => f.links?.includes(a.id)).length,
      )[0] ?? model.pieces[0];
  const start = Math.max(0, model.lineOf(host) - 1);
  const lines = model.lines
    .slice(start, start + WINDOW)
    .map((text, i) => ({ n: start + i, text }));
  // only the lines a finding actually points at are marked, not whole functions
  const flagged = new Set(
    model.findings.flatMap((f) =>
      (f.mark ?? [0]).map((o) => model.lineOf(f) + o),
    ),
  );
  const meaningful = (n: number) => /[A-Za-z]/.test(model.lines[n] ?? "");
  const firstFlag =
    lines.find((l) => flagged.has(l.n) && meaningful(l.n))?.n ??
    model.lineOf(host);

  const [line, setLine] = useState(firstFlag);
  const [q, setQ] = useState<AiQuestion>("explain");
  const id = pieceAtLine(model, line);
  const piece = id ? model.byId[id] : null;
  const answer = piece ? aiAnswer(model, piece, q) : "";
  const typed = useTyped(answer);
  const [body, code] = typed.split(/\n(?=\/\/|function )/);

  return (
    <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
      {/* the contract: click a line to ask about the piece that owns it */}
      <ol className="font-mono text-[12.5px] leading-[2]">
        {lines.map((l) => {
          const owner = pieceAtLine(model, l.n);
          const on = l.n === line;
          return (
            <li key={l.n}>
              <button
                type="button"
                disabled={!owner || !meaningful(l.n)}
                onClick={() => setLine(l.n)}
                className={`group flex w-full items-center gap-4 rounded-md px-2 text-left transition-colors disabled:cursor-default ${
                  on ? "bg-white/[.06]" : "enabled:hover:bg-white/[.03]"
                }`}
              >
                <span className="w-7 shrink-0 text-right text-white/20">
                  {l.n + 1}
                </span>
                <span
                  className={`size-1 shrink-0 rounded-full ${flagged.has(l.n) ? "bg-red" : "bg-transparent"}`}
                />
                <span
                  className={`truncate whitespace-pre ${on ? "text-white" : "text-white/55"}`}
                >
                  {tokenize(l.text).map((t, k) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: tokens of one static line
                      key={k}
                      className={
                        on && t.type !== "plain" ? `tok-${t.type}` : ""
                      }
                    >
                      {t.text}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* the answer about that piece, and three questions */}
      <div className="flex h-[440px] flex-col">
        <p className="text-[12.5px] text-dim">
          Line {line + 1}
          {piece && <span className="text-white/40"> · {piece.name}</span>}
        </p>
        <div className="lp-scroll mt-4 min-h-0 flex-1 overflow-y-auto pr-2 text-[14px] text-body leading-relaxed">
          <p className="whitespace-pre-wrap">{body}</p>
          {code && (
            <pre className="mt-4 overflow-x-auto font-mono text-[12px] text-white/70 leading-relaxed">
              {code}
            </pre>
          )}
        </div>
        <div className="mt-6 flex gap-1 border-white/[.07] border-t pt-4">
          {QUESTIONS.map((x) => (
            <button
              key={x.q}
              type="button"
              onClick={() => setQ(x.q)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                q === x.q ? "bg-white text-black" : "text-dim hover:text-fg"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
