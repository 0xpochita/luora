"use client";

import { useState } from "react";
import { Button, Chip, IconButton, Panel } from "@/components/ui";
import {
  type AiQuestion,
  type AtlasModel,
  aiAnswer,
  colorOf,
  RISK_LABEL,
  SYSTEMS,
  type TriageState,
} from "@/features/atlas";
import { CHECKLIST } from "@/features/atlas/utils/ai";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
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
  const cov = pieceCoverage(model, p.id);

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
        dot={findings.length ? "bad" : "neutral"}
        aside={
          <IconButton
            label="Close (Esc)"
            size="xs"
            onClick={() => onSelect(null)}
          >
            ✕
          </IconButton>
        }
      >
        <div className="flex flex-col gap-3 px-3.5 pt-1 pb-1.5">
          <h2 className="flex items-center gap-2 break-all font-medium font-mono text-[15px] text-fg">
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
          {(p.caller || proto || findings.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {p.caller && (
                <Chip>
                  Caller <span className="font-mono">{p.caller}</span>
                </Chip>
              )}
              {proto && <Chip tone="info">Integration · {proto.name}</Chip>}
              {findings.map((f) => (
                <Chip key={f.id} dot tone="bad">
                  <span className="font-mono">{f.name.slice(0, 4)}</span> ·{" "}
                  {RISK_LABEL[f.risk ?? "low"]}
                </Chip>
              ))}
            </div>
          )}
          {cov && (
            <p className="text-[12px] text-muted">
              <span
                className={
                  cov.state === "untested"
                    ? "text-red"
                    : cov.state === "covered"
                      ? "text-green"
                      : "text-fg"
                }
              >
                Tests cover{" "}
                <span className="font-mono">{pctLabel(cov.pct)}</span>
              </span>{" "}
              · lines{" "}
              <span className="font-mono">
                {cov.lines.hit}/{cov.lines.found}
              </span>{" "}
              · branches{" "}
              <span className="font-mono">
                {cov.branches.hit}/{cov.branches.found}
              </span>
              {cov.calls != null && (
                <>
                  {" "}
                  · entered <span className="font-mono">{cov.calls}×</span>
                </>
              )}
            </p>
          )}
          <p className="whitespace-pre-line text-fg/80 leading-relaxed">
            {p.desc}
          </p>
        </div>
        {conns.length > 0 && (
          <div className="m-[5px] rounded-inner bg-inset p-1.5">
            <p className="px-2 pt-1 pb-1 text-[12px] text-dim">
              Connections · <span className="font-mono">{conns.length}</span>
            </p>
            {conns.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => onSelect(c)}
                className="flex w-full items-center gap-2.5 rounded-tile px-2 py-1.5 text-left transition-colors hover:bg-raised"
              >
                <span
                  className="size-2 flex-none rounded-full"
                  style={{ background: colorOf(byId[c]) }}
                />
                <span className="truncate font-mono text-fg/90 text-xs">
                  {byId[c].name}
                </span>
                <span className="ml-auto text-[12px] text-dim">
                  {SYSTEMS[byId[c].sys].label}
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>
      {p.sys === "vulns" && (
        <FindingTriage model={model} finding={p} triage={triage} />
      )}
      <Panel label="What to check" aside={SYSTEMS[p.sys].label} inset>
        <ul className="grid gap-0.5 p-1.5">
          {CHECKLIST[p.sys].map((x) => (
            <li key={x}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-tile px-2 py-1.5 text-muted transition-colors hover:bg-raised has-checked:text-dim has-checked:line-through">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 flex-none cursor-pointer appearance-none rounded-full border border-border-strong bg-raised transition-colors checked:border-green checked:bg-green/80"
                />
                {x}
              </label>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel label="Luora AI" dot="violet" aside="Demo · mock" glow>
        <div className="flex flex-wrap gap-1.5 px-3.5 pt-1 pb-3">
          {QUESTIONS.map(({ q, label }) => (
            <Button key={q} size="sm" onClick={() => ask(q)}>
              {label}
            </Button>
          ))}
        </div>
        {answer && (
          <div className="m-[5px] mt-0 whitespace-pre-wrap rounded-inner bg-inset px-3 py-2.5 text-[12.5px] text-fg/85 leading-relaxed">
            {answer}
          </div>
        )}
      </Panel>
    </>
  );
}
