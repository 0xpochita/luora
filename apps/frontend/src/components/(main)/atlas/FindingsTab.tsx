"use client";

import { useState } from "react";
import { Button, Chip, ToggleChip } from "@/components/ui";
import type {
  AtlasModel,
  FindingTool,
  Risk,
  TriageState,
} from "@/features/atlas";
import {
  findingsReport,
  flaggedLines,
  isDismissed,
  lineRanges,
  reportsOf,
  SEVERITIES,
  SEVERITY_LABEL,
  TOOL_LABEL,
  TOOLS,
  TRIAGE_LABEL,
  titleOf,
} from "@/features/atlas/utils/findings";

/** Findings tab of the unit tray: filter by tool / severity, triage state per card, Markdown report export. */
export function FindingsTab({
  model,
  triage,
  selected,
  onSelect,
}: {
  model: AtlasModel;
  triage: TriageState;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [tools, setTools] = useState<Set<FindingTool>>(() => new Set(TOOLS));
  const [sevs, setSevs] = useState<Set<Risk>>(() => new Set(SEVERITIES));
  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (!next.delete(v)) next.add(v);
    return next;
  };

  const all = model.findings;
  const present = TOOLS.filter((t) =>
    all.some((f) => reportsOf(f).some((r) => r.tool === t)),
  );
  const shown = all.filter(
    (f) =>
      sevs.has(f.risk ?? "low") && reportsOf(f).some((r) => tools.has(r.tool)),
  );
  const confirmed = all.filter(
    (f) => triage.get(f.id).status === "confirmed",
  ).length;

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([findingsReport(model, triage.map)], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.contract}-findings.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
        {present.map((t) => (
          <ToggleChip
            key={t}
            label={`${TOOL_LABEL[t]} ${all.filter((f) => reportsOf(f).some((r) => r.tool === t)).length}`}
            on={tools.has(t)}
            onToggle={() => setTools(toggle(tools, t))}
          />
        ))}
        <span className="w-2" />
        {SEVERITIES.map((s) => (
          <ToggleChip
            key={s}
            label={`${SEVERITY_LABEL[s]} ${all.filter((f) => (f.risk ?? "low") === s).length}`}
            on={sevs.has(s)}
            onToggle={() => setSevs(toggle(sevs, s))}
          />
        ))}
        <span className="ml-auto text-dim ui-label">
          {shown.length}/{all.length} shown · {triage.dismissed.size} dismissed
        </span>
        <Button
          size="sm"
          disabled={!confirmed}
          onClick={download}
          title={
            confirmed
              ? "Download confirmed findings as Markdown"
              : "Confirm findings in the inspector to include them"
          }
        >
          Report · {confirmed} confirmed ↓
        </Button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pt-2.5 pb-2">
        {shown.map((f) => {
          const on = selected === f.id;
          const t = triage.get(f.id);
          const rs = reportsOf(f);
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => onSelect(on ? null : f.id)}
              className={`relative flex w-[300px] flex-none flex-col gap-1.5 rounded-card border px-3 py-2.5 text-left shadow-soft transition-[colors,opacity] ${
                on
                  ? "border-border-strong bg-card-grad shadow-float"
                  : "border-border bg-card-grad hover:border-border-strong"
              } ${isDismissed(t) ? "opacity-40" : ""}`}
            >
              <span className="flex items-center gap-1.5">
                <Chip
                  tone={
                    f.risk === "high" || f.risk === "med" ? "bad" : "neutral"
                  }
                  dot
                >
                  {SEVERITY_LABEL[f.risk ?? "low"]}
                </Chip>
                <Chip>
                  {[...new Set(rs.map((r) => TOOL_LABEL[r.tool]))].join(" + ")}
                </Chip>
                {t.status !== "open" && (
                  <Chip
                    tone={t.status === "confirmed" ? "bad" : "neutral"}
                    dot={t.status === "confirmed"}
                    className="ml-auto"
                  >
                    {TRIAGE_LABEL[t.status]}
                  </Chip>
                )}
              </span>
              <span className="truncate text-[13px] text-fg">
                <span className="font-mono text-dim">{f.name.slice(0, 4)}</span>{" "}
                {titleOf(f)}
              </span>
              <span className="truncate font-mono text-dim text-xs">
                {f.detector ?? rs[0].detector}
                {f.confidence &&
                  ` · conf ${SEVERITY_LABEL[f.confidence].toLowerCase()}`}
                {` · L${lineRanges(flaggedLines(f, model.lineOf(f)))}`}
              </span>
            </button>
          );
        })}
        {!shown.length && (
          <span className="py-2 text-dim ui-label">
            No findings match the filters
          </span>
        )}
      </div>
    </>
  );
}
