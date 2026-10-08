"use client";

import { Chip, Panel, SegmentedControl } from "@/components/ui";
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
    <Panel label="Triage" aside={TRIAGE_LABEL[t.status]}>
      <div className="flex flex-col gap-3 p-3">
        <table className="w-full font-mono text-xs">
          <thead className="text-left text-dim ui-label">
            <tr>
              <th className="pb-1 font-normal">Tool</th>
              <th className="pr-2 pb-1 font-normal">Detector</th>
              <th className="pr-2 pb-1 font-normal">Severity</th>
              <th className="pb-1 font-normal">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {reportsOf(f).map((r) => (
              <tr
                key={`${r.tool}${r.detector}`}
                className="border-line border-t"
              >
                <td className="py-1 pr-2">
                  <Chip>{TOOL_LABEL[r.tool]}</Chip>
                </td>
                <td className="break-all py-1 pr-2 text-ink">
                  {r.ref ? (
                    <a
                      href={r.ref}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-line underline-offset-2 hover:decoration-accent"
                    >
                      {r.detector}
                    </a>
                  ) : (
                    r.detector
                  )}
                </td>
                <td
                  className={`py-1 pr-2 ${r.risk === "high" || r.risk === "med" ? "text-bad" : "text-muted"}`}
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
        <p className="font-mono text-muted text-xs">
          Affected · {model.file}:{lineRanges(lines)}
        </p>
        <SegmentedControl
          value={t.status}
          onChange={(status) => triage.set(f.id, { status })}
          options={STATUSES}
        />
        <textarea
          value={t.note}
          onChange={(e) => triage.set(f.id, { note: e.target.value })}
          placeholder="Note: why it is real / not, which test covers it…"
          rows={3}
          className="w-full resize-y border border-line bg-shell px-2 py-1.5 font-mono text-ink text-xs placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>
    </Panel>
  );
}
