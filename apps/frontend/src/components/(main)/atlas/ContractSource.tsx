"use client";

import { Panel } from "@/components/ui";
import type { AtlasModel, CitySim } from "@/features/atlas";
import { STEP_VERB } from "@/features/atlas/utils/units";
import { CodeView } from "../source/CodeView";

/** Contract source: selected piece's lines, finding lines in red, current simulation step in focus. */
export function ContractSource({
  model,
  selected,
  sim,
}: {
  model: AtlasModel;
  selected: string | null;
  sim: CitySim;
}) {
  const p = selected ? model.byId[selected] : null;
  const start = p ? model.lineOf(p) : 0;
  const lines = p ? Array.from({ length: p.n ?? 1 }, (_, i) => start + i) : [];
  const bad = model.findings.flatMap((f) =>
    (f.mark ?? [0]).map((m) => model.lineOf(f) + m),
  );
  const at = sim.step;
  const current = at >= 0 ? sim.lines[at] : undefined;
  if (current != null && sim.late[at]) bad.push(current);
  const [k, t] = sim.steps[at] ?? [];

  return (
    <Panel
      label="Source"
      aside={model.file.split("/").pop()}
      className="h-[52vh] min-h-[280px] flex-none"
    >
      <p className="truncate border-line border-b px-3 py-2 font-mono text-muted text-xs">
        {current != null && t ? (
          <>
            <b className={sim.late[at] ? "text-bad" : "text-ink"}>
              Step {String(at + 1).padStart(2, "0")} · {k && STEP_VERB[k]}{" "}
              {model.byId[t]?.name ?? t}
            </b>
            {` · L${current + 1}`}
          </>
        ) : p ? (
          <>
            <b className="font-semibold text-ink">{p.name}</b>
            {` · L${start + 1}–${start + (p.n ?? 1)}`}
          </>
        ) : (
          <span className="text-dim hud-label">
            Select a building · red = finding
          </span>
        )}
      </p>
      <CodeView
        source={model.source}
        lines={lines}
        bad={bad}
        current={current}
      />
    </Panel>
  );
}
