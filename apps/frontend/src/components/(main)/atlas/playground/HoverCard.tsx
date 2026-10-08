import { type AtlasModel, SYSTEMS } from "@/features/atlas";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
import { type Verdict, verdictLine } from "@/features/atlas/utils/playground";
import { unitCode } from "@/features/atlas/utils/units";

/** RTS unit tooltip at the pointer: what the building is, who may call it, tests, findings, drop verdict. */
export function HoverCard({
  model,
  id,
  x,
  y,
  verdict,
  caller,
}: {
  model: AtlasModel;
  id: string;
  x: number;
  y: number;
  verdict: Verdict | null;
  caller: string;
}) {
  const p = model.byId[id];
  if (!p) return null;
  const cov = pieceCoverage(model, id);
  const findings = model.findings.filter(
    (f) => model.lesion[f.id] === id || (f.links ?? []).includes(id),
  ).length;
  const tone =
    verdict?.kind === "call"
      ? verdict.access.pass
        ? "text-ink"
        : "text-ok"
      : "text-muted";
  // keep the card on screen: flip left / up near the right / bottom edge
  const left = x + 300 > innerWidth ? x - 296 : x + 16;
  const top = y + 170 > innerHeight ? y - 160 : y + 16;
  return (
    <div
      className="pg-hover pointer-events-none fixed z-50 w-[280px] border border-edge bg-shell/95 font-mono text-xs"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2 border-line border-b px-2.5 py-1.5">
        <span className="text-ink">{unitCode(model, id)}</span>
        <b className="truncate font-medium text-ink">{p.name}</b>
      </div>
      <dl className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-0.5 px-2.5 py-1.5">
        <dt className="text-dim hud-label">Type</dt>
        <dd className="truncate text-muted">{SYSTEMS[p.sys].label}</dd>
        {p.caller && (
          <>
            <dt className="text-dim hud-label">Who can call</dt>
            <dd className="text-muted">{p.caller}</dd>
          </>
        )}
        <dt className="text-dim hud-label">Coverage</dt>
        <dd
          className={
            cov?.state === "untested"
              ? "text-bad"
              : cov?.state === "covered"
                ? "text-ok"
                : "text-muted"
          }
        >
          {cov ? `${pctLabel(cov.pct)} · ${cov.state}` : "no code / no data"}
        </dd>
        <dt className="text-dim hud-label">Findings</dt>
        <dd className={findings ? "text-bad" : "text-ok"}>
          {findings || "none"}
        </dd>
      </dl>
      {verdict && (
        <p className={`border-line border-t px-2.5 py-1.5 ${tone}`}>
          <span className="text-dim hud-label">Drop as {caller} · </span>
          {verdictLine(model, verdict)}
          {verdict.kind === "call" && !verdict.access.pass && (
            <span className="block text-dim">
              Access control would stop it (expected)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
