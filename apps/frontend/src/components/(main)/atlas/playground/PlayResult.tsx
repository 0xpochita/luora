import { Chip, Panel } from "@/components/ui";
import { type AtlasModel, type CitySim, SYSTEMS } from "@/features/atlas";
import type { Playground } from "@/features/atlas/hooks/usePlayground";
import { CHECKLIST } from "@/features/atlas/utils/ai";
import { SEVERITY } from "@/features/atlas/utils/audit";
import { pctLabel } from "@/features/atlas/utils/coverage";
import { formatInt, pathReport } from "@/features/atlas/utils/playground";
import { unitCode } from "@/features/atlas/utils/units";

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-3 py-0.5">
    <span className="w-[92px] flex-none text-dim hud-label">{k}</span>
    <span className="min-w-0 font-mono text-muted text-xs">{v || "—"}</span>
  </div>
);
const List = ({ title, items }: { title: string; items: string[] }) => (
  <div className="border-line border-t px-3 py-2">
    <h4 className="mb-1 text-dim hud-label">{title}</h4>
    <ul className="grid gap-0.5 font-mono text-[11px] text-muted">
      {items.map((x) => (
        <li key={x} className="break-all">
          {x}
        </li>
      ))}
    </ul>
  </div>
);

/** Card for the token's last drop: the replayed call, an access-control stop, or reachability. */
export function PlayResult({
  model,
  pg,
  sim,
  lit,
  onSelect,
}: {
  model: AtlasModel;
  pg: Playground;
  sim: CitySim;
  lit: string[];
  onSelect: (id: string | null) => void;
}) {
  const v = pg.verdict;
  if (!v) return null;
  const close = (
    <button type="button" className="x" onClick={pg.reset}>
      ✕ X
    </button>
  );
  const name = (id: string) =>
    `${unitCode(model, id)} ${model.byId[id]?.name ?? id}`;

  if (v.kind === "reach") {
    const p = model.byId[v.id];
    return (
      <Panel label={`No call · ${SYSTEMS[v.sys].label}`} aside={close}>
        <div className="px-3 py-2">
          <p className="mb-1 font-mono text-ink text-sm">{name(v.id)}</p>
          <p className="text-muted text-xs">{p.desc}</p>
        </div>
        <div className="border-line border-t px-3 py-2">
          <h4 className="mb-1 text-dim hud-label">
            Reached by · click to run it as {pg.caller}
          </h4>
          {v.reach.length ? (
            <ul className="grid gap-1">
              {v.reach.map((r) => (
                <li key={r.entry}>
                  <button
                    type="button"
                    className="pg-link"
                    onClick={() => pg.drop(r.entry)}
                  >
                    <span>{name(r.entry)}</span>
                    <span className="text-dim">{r.how}</span>
                    {r.order && (
                      <span
                        className={
                          r.order === "before state writes"
                            ? "text-bad"
                            : "text-ok"
                        }
                        title="Where the external call sits relative to the entry's storage writes"
                      >
                        {r.order}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-dim text-xs">No entry point reaches it.</p>
          )}
        </div>
        <List title="What to check" items={CHECKLIST[v.sys]} />
      </Panel>
    );
  }

  const entry = v.entry;
  const fails = pg.tracesOf(entry).filter((c) => !c.ok);
  if (!v.access.pass) {
    const g = v.access.guard;
    return (
      <Panel label="Access control · pass" aside={close}>
        <div className="border-ok/40 border-l-2 px-3 py-2">
          <Chip tone="ok" dot>
            Reverts as expected
          </Chip>
          <p className="mt-2 font-mono text-ink text-xs">{v.access.caption}</p>
          {g && (
            <p className="mt-1 font-mono text-[11px] text-muted">
              L{g.line + 1} {model.lines[g.line]?.trim()}
            </p>
          )}
          <p className="mt-2 text-muted text-xs">
            {pg.active?.caller} is not {v.access.required}: the call stops at
            the gate before any state is read or written.
          </p>
        </div>
        {fails.map((c) => (
          <p
            key={c.key}
            className="border-line border-t px-3 py-2 font-mono text-[11px] text-ok"
          >
            ✓ {c.test}: reverted "{c.ret}" as {c.caller ?? "test"}
          </p>
        ))}
        <div className="border-line border-t p-2">
          <button
            type="button"
            className="pg-link"
            onClick={() => pg.drop(entry, v.access.required)}
          >
            Run as {v.access.required}
          </button>
        </div>
      </Panel>
    );
  }

  const r = pathReport(model, entry);
  const last = sim.steps.length - 1;
  const done = sim.entry === entry && sim.step >= last && !sim.playing;
  const litF = r.findings.filter((f) => lit.includes(f.id));
  const tr = pg.trace;
  return (
    <Panel
      label={`Call · ${model.byId[entry].name} as ${pg.active?.caller}`}
      aside={close}
    >
      <div className="px-3 py-2">
        <Row
          k="Progress"
          v={
            done
              ? `done · ${r.steps} steps`
              : `step ${Math.max(0, sim.step + 1)}/${r.steps}`
          }
        />
        <Row
          k="Amount"
          v={pg.amountUsed ? pg.amountLabel : "unused · no USDC parameter"}
        />
        {done && (
          <>
            <Row k="Slots written" v={r.written.join(", ")} />
            <Row k="Ext. calls" v={r.calls.join(", ")} />
            <Row k="Events" v={r.events.join(", ")} />
            <Row
              k="Coverage"
              v={
                r.coverage
                  ? `${pctLabel(r.coverage.pct)} · lines ${r.coverage.lines.hit}/${r.coverage.lines.found} · branches ${r.coverage.branches.hit}/${r.coverage.branches.found}`
                  : "no coverage data"
              }
            />
          </>
        )}
      </div>
      <div className="border-line border-t px-3 py-2">
        <h4 className="mb-1 text-dim hud-label">
          Findings on this path · {litF.length}/{r.findings.length} reached
        </h4>
        <ul className="grid gap-0.5">
          {(done ? r.findings : litF).map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="pg-link bad"
                onClick={() => onSelect(f.id)}
              >
                <span>{f.name}</span>
                <span>{SEVERITY[f.risk ?? "low"]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {pg.traces.length > 0 && (
        <div className="border-line border-t px-3 py-2">
          <h4 className="mb-1 text-dim hud-label">Forge trace</h4>
          <div className="flex flex-wrap gap-1">
            {pg.traces.map((c) => (
              <button
                type="button"
                key={c.key}
                aria-pressed={pg.traceTest === c.key}
                className={`pg-link ${pg.traceTest === c.key ? "on" : ""}`}
                onClick={() =>
                  pg.setTraceTest(pg.traceTest === c.key ? null : c.key)
                }
              >
                Use values from {c.key}
              </button>
            ))}
          </div>
          {tr && (
            <div className="mt-2 font-mono text-[11px] text-muted">
              <Row k="Called as" v={tr.caller ?? "test contract"} />
              <Row
                k="Args"
                v={tr.args
                  .split(", ")
                  .map((a) =>
                    a.replace(/=(\d+)$/, (_, n) => `=${formatInt(n)}`),
                  )
                  .join(", ")}
              />
              <Row
                k={tr.ok ? "Returned" : "Reverted"}
                v={tr.ret || "(nothing)"}
              />
              {tr.calls.length > 0 && <List title="Calls" items={tr.calls} />}
              {tr.events.length > 0 && (
                <List title="Events" items={tr.events} />
              )}
            </div>
          )}
        </div>
      )}
      {done && (
        <List
          title="What to check"
          items={[
            ...CHECKLIST.entry,
            ...(r.calls.length ? CHECKLIST.calls : []),
          ]}
        />
      )}
    </Panel>
  );
}
