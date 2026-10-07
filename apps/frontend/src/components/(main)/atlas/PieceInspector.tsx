"use client";

import { useState } from "react";
import { Chip, Panel } from "@/components/ui";
import {
  type AiQuestion,
  type AtlasModel,
  aiAnswer,
  colorOf,
  RISK_LABEL,
  SYSTEMS,
} from "@/features/atlas";
import { tokenize } from "@/features/trace";

const QUESTIONS: { q: AiQuestion; label: string }[] = [
  { q: "explain", label: "Explain" },
  { q: "risks", label: "What could go wrong?" },
  { q: "test", label: "Write invariant test" },
];

/** Selected piece: description, connections, source excerpt and the (mock, defensive) AI assistant. */
export function PieceInspector({
  model,
  id,
  onSelect,
}: {
  model: AtlasModel;
  id: string;
  onSelect: (id: string | null) => void;
}) {
  const { byId, findings: FINDINGS, lines: LINES, layerOf, neighbours } = model;
  const p = byId[id];
  const [answer, setAnswer] = useState("");

  const s = model.lineOf(p);
  const e = s + (p.n ?? 1) - 1;
  const marks = new Set((p.mark ?? []).map((m) => s + m));
  const from = Math.max(0, s - 2);
  const to = Math.min(LINES.length - 1, e + 2);
  const findings =
    p.sys === "vulns"
      ? [p]
      : FINDINGS.filter((f) => (f.links ?? []).includes(p.id));
  const conns = [...neighbours(p.id)].filter((c) => c !== p.id);

  const ask = (q: AiQuestion) => {
    const text = aiAnswer(model, p, q);
    let i = 0;
    const tick = () => {
      i += 5;
      setAnswer(text.slice(0, i));
      if (i < text.length) setTimeout(tick, 10);
    };
    tick();
  };

  return (
    <>
      <Panel
        label={`${SYSTEMS[p.sys].label} · ${layerOf(p).name} layer`}
        aside={
          <button
            type="button"
            className="x"
            aria-label="Close"
            onClick={() => onSelect(null)}
          >
            ✕ Esc
          </button>
        }
        className="ins"
      >
        <div
          className="p-3"
          style={{ "--c": colorOf(p) } as React.CSSProperties}
        >
          <h2>{p.name}</h2>
          <div className="badges">
            {p.caller && <Chip>Caller {p.caller}</Chip>}
            {findings.map((f) => (
              <Chip key={f.id} dot tone="bad">
                {f.name.slice(0, 4)} · {RISK_LABEL[f.risk ?? "low"]}
              </Chip>
            ))}
          </div>
          <p>{p.desc}</p>
          <div className="conns">
            {conns.map((c) => (
              <button
                type="button"
                key={c}
                className="conn"
                style={{ "--c": colorOf(byId[c]) } as React.CSSProperties}
                onClick={() => onSelect(c)}
              >
                {byId[c].name}
              </button>
            ))}
          </div>
          <pre className="code">
            {LINES.slice(from, to + 1).map((line, k) => {
              const n = from + k;
              return (
                <span
                  key={`L${n}`}
                  className={`cl ${marks.has(n) ? "mk" : n >= s && n <= e ? "hl" : ""}`}
                >
                  <span className="n">{n + 1}</span>
                  {tokenize(line).map((t, j) => (
                    <span
                      key={`L${n}:${j.toString()}`}
                      className={
                        t.type === "plain" ? undefined : `tok-${t.type}`
                      }
                    >
                      {t.text}
                    </span>
                  ))}
                  {line === "" && " "}
                </span>
              );
            })}
          </pre>
        </div>
      </Panel>
      <Panel label="Luora AI" aside="Demo · mock">
        <div className="qs">
          {QUESTIONS.map(({ q, label }) => (
            <button type="button" key={q} className="q" onClick={() => ask(q)}>
              {label}
            </button>
          ))}
        </div>
        {answer && <div className="msg">{answer}</div>}
      </Panel>
    </>
  );
}
