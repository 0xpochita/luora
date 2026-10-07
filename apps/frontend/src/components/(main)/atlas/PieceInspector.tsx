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
  type TriageState,
} from "@/features/atlas";
import { protocolOf } from "@/features/atlas/utils/protocols";
import { FindingTriage } from "./FindingTriage";

const QUESTIONS: { q: AiQuestion; label: string }[] = [
  { q: "explain", label: "Explain" },
  { q: "risks", label: "What could go wrong?" },
  { q: "test", label: "Write invariant test" },
];

/** Selected piece: description, connections and the (mock, defensive) AI assistant. */
export function PieceInspector({
  model,
  id,
  onSelect,
  triage,
}: {
  model: AtlasModel;
  id: string;
  onSelect: (id: string | null) => void;
  triage: TriageState;
}) {
  const { byId, findings: FINDINGS, layerOf, neighbours } = model;
  const p = byId[id];
  const [answer, setAnswer] = useState("");

  const findings =
    p.sys === "vulns"
      ? [p]
      : FINDINGS.filter((f) => (f.links ?? []).includes(p.id));
  const conns = [...neighbours(p.id)].filter((c) => c !== p.id);
  const proto = protocolOf(p);

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
          <h2 className="flex items-center gap-2">
            {proto && (
              <span
                role="img"
                aria-label={proto.name}
                title={proto.name}
                className="plogo lg"
                style={{ backgroundImage: `url(${proto.logo})` }}
              />
            )}
            {p.name}
          </h2>
          <div className="badges">
            {p.caller && <Chip>Caller {p.caller}</Chip>}
            {proto && <Chip>Integration · {proto.name}</Chip>}
            {findings.map((f) => (
              <Chip key={f.id} dot tone="bad">
                {f.name.slice(0, 4)} · {RISK_LABEL[f.risk ?? "low"]}
              </Chip>
            ))}
          </div>
          <p className="whitespace-pre-line">{p.desc}</p>
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
        </div>
      </Panel>
      {p.sys === "vulns" && (
        <FindingTriage model={model} finding={p} triage={triage} />
      )}
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
