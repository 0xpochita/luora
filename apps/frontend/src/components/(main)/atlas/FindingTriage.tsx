"use client";

import {
  Chip,
  Panel,
  SegmentedControl,
  Textarea,
  type Tone,
} from "@/components/ui";
import type { AtlasModel, Piece, TriageState } from "@/features/atlas";
import {
  flaggedLines,
  lineRanges,
  reportsOf,
  SEVERITY_LABEL,
  TOOL_LABEL,
  TRIAGE_LABEL,
} from "@/features/atlas/utils/findings";

const STATUSES = Object.entries(TRIAGE_LABEL).map(([value, label]) => ({
  value: value as keyof typeof TRIAGE_LABEL,
  label,
}));

const STATUS_DOT: Record<keyof typeof TRIAGE_LABEL, Tone> = {
  open: "warn",
  confirmed: "bad",
  "false-positive": "ok",
  duplicate: "neutral",
};

/** Inspector block for a finding: who reported it, where, and the auditor's triage. */
export function FindingTriage({
  model,
  finding: f,
  triage,
}: {
  model: AtlasModel;
  finding: Piece;
  triage: TriageState;
}) {
  const t = triage.get(f.id);
  const lines = flaggedLines(f, model.lineOf(f));
  return (
    <Panel
      label="Triage"
      dot={STATUS_DOT[t.status]}
      aside={TRIAGE_LABEL[t.status]}
    >
      <div className="m-[5px] mt-0 rounded-inner bg-inset px-3 py-2">
        <table className="w-full text-xs">
          <thead className="text-left text-[12px] text-dim">
            <tr>
              <th className="pr-2 pb-1.5 font-normal">Tool</th>
              <th className="pr-2 pb-1.5 font-normal">Detector</th>
              <th className="pr-2 pb-1.5 font-normal">Severity</th>
              <th className="pb-1.5 font-normal">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {reportsOf(f).map((r) => (
              <tr key={`${r.tool}${r.detector}`}>
                <td className="py-1 pr-2">
                  <Chip>{TOOL_LABEL[r.tool]}</Chip>
                </td>
                <td className="break-all py-1 pr-2 font-mono text-fg">
                  {r.ref ? (
                    <a
                      href={r.ref}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-border-strong underline-offset-2 hover:decoration-violet"
                    >
                      {r.detector}
                    </a>
                  ) : (
                    r.detector
                  )}
                </td>
                <td
                  className={`py-1 pr-2 ${r.risk === "high" || r.risk === "med" ? "text-red" : "text-muted"}`}
                >
                  {SEVERITY_LABEL[r.risk]}
                </td>
                <td className="py-1 text-muted">
                  {r.confidence ? SEVERITY_LABEL[r.confidence] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 px-3.5 pt-1.5 pb-3.5">
        <p className="text-[12px] text-muted">
          Affected{" "}
          <span className="font-mono text-fg/80">
            {model.file}:{lineRanges(lines)}
          </span>
        </p>
        <SegmentedControl
          value={t.status}
          onChange={(status) => triage.set(f.id, { status })}
          options={STATUSES}
        />
        <Textarea
          value={t.note}
          onChange={(e) => triage.set(f.id, { note: e.target.value })}
          placeholder="Note: why it is real or not, which test covers it…"
          rows={3}
          className="w-full text-[13px]"
        />
      </div>
    </Panel>
  );
}
