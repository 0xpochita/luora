import { Meter, Panel } from "@/components/ui";
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
        className="grid w-full grid-cols-[52px_1fr_auto] items-baseline gap-2 border-line border-b px-3 py-1.5 text-left transition-colors last:border-b-0 hover:bg-soft"
      >
        <span className={`font-mono text-xs ${bad ? "text-bad" : "text-ink"}`}>
          {unitCode(model, x.id)}
        </span>
        <span className="truncate font-mono text-xs">
          {model.byId[x.id]?.name}
          <span className="ml-2 text-dim">{x.why}</span>
        </span>
        <span
          className={`font-mono text-xs ${bad ? "text-bad" : "text-muted"}`}
        >
          {pctLabel(x.cov.pct)}
        </span>
      </button>
    </li>
  );
  return (
    <Panel label="Test coverage" aside={cov.tool}>
      {rows.map(([k, c]) => (
        <div
          key={k}
          className="grid grid-cols-[1fr_60px_auto] items-center gap-3 border-line border-b px-3 py-2"
        >
          <span className="text-muted ui-label">{k}</span>
          <Meter
            value={ratio(c)}
            tone={ratio(c) < 1 ? "text-tick" : "text-ok"}
            className="w-full"
          />
          <span className="font-mono text-xs">
            {pctLabel(ratio(c))}{" "}
            <span className="text-dim">
              {c.hit}/{c.found}
            </span>
          </span>
        </div>
      ))}
      <p
        className={`px-3 pt-2.5 pb-1 ui-label ${untested.length ? "text-bad" : "text-ok"}`}
      >
        {untested.length
          ? `▲ Audit focus · ${untested.length} state-changing entr${untested.length > 1 ? "ies" : "y"} untested`
          : "Every state-changing entry point runs under the tests"}
      </p>
      <ul>{untested.map((x) => item(x, true))}</ul>
      {gaps.length > 0 && (
        <>
          <p className="px-3 pt-2.5 pb-1 text-dim ui-label">Partly tested</p>
          <ul>{gaps.map((x) => item(x, false))}</ul>
        </>
      )}
    </Panel>
  );
}
