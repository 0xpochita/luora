import { Chip, Meter, Panel } from "@/components/ui";
import type { AtlasModel } from "@/features/atlas";
import {
  coverageFocus,
  type FocusItem,
  pctLabel,
  ratio,
} from "@/features/atlas/utils/coverage";
import { unitCode } from "@/features/atlas/utils/units";

/** Contract test coverage + audit focus list (state-changing entry points the tests never ran). */
export function CoverageSummary({
  model,
  onSelect,
}: {
  model: AtlasModel;
  onSelect: (id: string) => void;
}) {
  const cov = model.coverage;
  if (!cov) return null;
  const { untested, gaps } = coverageFocus(model);
  const rows = [
    ["Lines", cov.lines],
    ["Branches", cov.branches],
    ["Functions", cov.functions],
  ] as const;
  const item = (x: FocusItem, bad: boolean) => (
    <li key={x.id}>
      <button
        type="button"
        onClick={() => onSelect(x.id)}
        className="grid w-full grid-cols-[44px_1fr_auto] items-baseline gap-2 rounded-tile px-2.5 py-1.5 text-left transition-colors hover:bg-hover"
      >
        <span
          className={`font-mono text-xs ${bad ? "text-red" : "text-muted"}`}
        >
          {unitCode(model, x.id)}
        </span>
        <span className="truncate">
          <span className="font-mono text-fg text-xs">
            {model.byId[x.id]?.name}
          </span>
          <span className="ml-2 text-[12.5px] text-dim">{x.why}</span>
        </span>
        <span
          className={`font-mono text-xs ${bad ? "text-red" : "text-muted"}`}
        >
          {pctLabel(x.cov.pct)}
        </span>
      </button>
    </li>
  );
  return (
    <Panel
      label="Test coverage"
      dot={untested.length ? "bad" : "ok"}
      aside={cov.tool}
    >
      <div className="grid gap-2.5 px-4 pt-1 pb-3.5">
        {rows.map(([k, c]) => (
          <div
            key={k}
            className="grid grid-cols-[72px_1fr_auto] items-center gap-3"
          >
            <span className="text-[13px] text-muted">{k}</span>
            <Meter value={ratio(c)} className="w-full" />
            <span className="w-[92px] text-right font-mono text-xs">
              {pctLabel(ratio(c))}{" "}
              <span className="text-dim">
                {c.hit}/{c.found}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="m-2 mt-0 flex flex-col gap-1 rounded-inner border border-border bg-inner-grad p-1.5">
        <div className="px-1 pt-0.5 pb-1">
          {untested.length ? (
            <Chip tone="bad" dot>
              Audit focus · {untested.length} state-changing entr
              {untested.length > 1 ? "ies" : "y"} untested
            </Chip>
          ) : (
            <Chip tone="ok" dot>
              Every state-changing entry point runs under the tests
            </Chip>
          )}
        </div>
        {untested.length > 0 && <ul>{untested.map((x) => item(x, true))}</ul>}
        {gaps.length > 0 && (
          <>
            <p className="px-2.5 pt-1.5 text-[12.5px] text-dim">
              Partly tested
            </p>
            <ul>{gaps.map((x) => item(x, false))}</ul>
          </>
        )}
      </div>
    </Panel>
  );
}
