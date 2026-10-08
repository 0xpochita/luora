"use client";

import { Panel } from "@/components/ui";
import type { AtlasModel, StepSim } from "@/features/atlas";
import { linesOf, pieceAtLine } from "@/features/atlas/utils/audit";
import { hitLabel } from "@/features/atlas/utils/coverage";
import { STEP_VERB } from "@/features/atlas/utils/units";
import { CodeView } from "../source/CodeView";

/** Contract source: selected piece's lines, finding lines in red, current simulation step in focus. */
export function ContractSource({
  model,
  selected,
  sim,
  onSelect,
}: {
  model: AtlasModel;
  selected: string | null;
  sim: StepSim;
  onSelect: (id: string | null) => void;
}) {
  const p = selected ? model.byId[selected] : null;
  const start = p ? model.lineOf(p) : 0;
  const lines = p ? linesOf(model, p) : [];
  const bad = model.findings.flatMap((f) =>
    (f.mark ?? [0]).map((m) => model.lineOf(f) + m),
  );
  const at = sim.step;
  const current = at >= 0 ? sim.lines[at] : undefined;
  if (current != null && sim.late[at]) bad.push(current);
  const [k, t] = sim.steps[at] ?? [];
  const cov = model.coverage;
  // coverage gutter: times each line ran under the tests (red 0 = never), ◆ taken/total branches when some never ran
  const gutter = cov
    ? (n: number) => {
        const hits = cov.hits[n];
        const br = cov.branchHits[n] ?? [];
        const taken = br.filter((b) => b != null && b > 0).length;
        return (
          <span className="inline-flex w-[64px] select-none text-[10px]">
            <span
              title={hits == null ? undefined : `Ran ${hits}× under the tests`}
              className={`w-[36px] pr-1.5 text-right ${hits === 0 ? "text-red" : "text-dim/80"}`}
            >
              {hits == null ? "" : hits ? hitLabel(hits) : "0"}
            </span>
            {taken < br.length && (
              <span
                title={`${br.length - taken} of ${br.length} branches never taken`}
                className="pl-1 text-red/80"
              >
                ◆{taken}/{br.length}
              </span>
            )}
          </span>
        );
      }
    : undefined;
  const range = p
    ? `L${start + 1}–${start + (p.n ?? 1)}`
    : current != null
      ? `L${current + 1}`
      : null;

  return (
    <Panel
      label="Source"
      dot={current != null ? "violet" : "neutral"}
      aside={
        <span className="font-mono">
          {model.file.split("/").pop()}
          {range && <span className="ml-2 text-muted">{range}</span>}
        </span>
      }
      inset
      className="h-[52vh] min-h-[280px] flex-none [&>div]:overflow-hidden"
    >
      <p className="truncate px-3 pt-2.5 pb-1 text-[12px] text-muted">
        {current != null && t ? (
          <>
            <span className={sim.late[at] ? "text-red" : "text-violet"}>
              Step <span className="font-mono">{at + 1}</span>
            </span>{" "}
            · <span className="lowercase">{k && STEP_VERB[k]}</span>{" "}
            <span className="font-mono text-fg">
              {model.byId[t]?.name ?? t}
            </span>
          </>
        ) : p ? (
          <span className="font-mono text-fg">{p.name}</span>
        ) : (
          <span className="text-dim">
            Select a piece or click a line · red lines are findings
            {cov && " · gutter shows test hits"}
          </span>
        )}
      </p>
      <CodeView
        source={model.source}
        lines={lines}
        bad={bad}
        current={current}
        gutter={gutter}
        onLine={(n) => {
          const id = pieceAtLine(model, n);
          if (id) onSelect(id);
        }}
      />
    </Panel>
  );
}
