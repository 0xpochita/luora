"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brackets,
  Chip,
  Panel,
  SegmentedControl,
  Tabs,
  ToggleChip,
} from "@/components/ui";
import type {
  AtlasModel,
  CitySim,
  SystemKey,
  TriageState,
} from "@/features/atlas";
import type {
  CityScene,
  CityZoom,
} from "@/features/atlas/engine/create-city-scene";
import { usePlayground } from "@/features/atlas/hooks/usePlayground";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
import type { TraceCall } from "@/features/atlas/utils/playground";
import { protocolOf } from "@/features/atlas/utils/protocols";
import { STEP_VERB, unitCode, unitStatus } from "@/features/atlas/utils/units";
import { CityLegend } from "./CityLegend";
import { FindingsTab } from "./FindingsTab";
import { PieceIcon } from "./PieceIcon";
import { CityPlayground } from "./playground/CityPlayground";

type UnitTab = "entry" | "storage" | "external" | "findings";
const UNIT_TABS: { value: UnitTab; label: string; sys: SystemKey[] }[] = [
  { value: "entry", label: "Entry points", sys: ["entry", "access"] },
  { value: "storage", label: "Storage", sys: ["storage"] },
  { value: "external", label: "External", sys: ["deps", "calls"] },
  { value: "findings", label: "Findings", sys: ["vulns"] },
];
const STATUS = {
  finding: { tone: "bad", label: "Finding" },
  privileged: { tone: "neutral", label: "Owner" },
  missing: { tone: "bad", label: "Missing" },
  ok: { tone: "ok", label: "Clear" },
} as const;

/** Contract as a dark 3D city: districts per layer, buildings per piece, unit list below. */
export function CityStage({
  model,
  selected,
  onSelect,
  sim,
  triage,
  calls = [],
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
  sim: CitySim;
  triage: TriageState;
  /** forge test calls into the contract, for the playground's trace values */
  calls?: TraceCall[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scene = useRef<CityScene | null>(null);
  const [ready, setReady] = useState(false);
  const pg = usePlayground(model, calls, selected, onSelect, sim);
  // with the token picked, a building click / unit card Enter drops it there
  const choose = (id: string | null) => (pg.armed ? pg.drop(id) : onSelect(id));
  const pick = useRef(choose);
  pick.current = choose;
  const [zoom, setZoom] = useState<CityZoom>("city");
  const [audit, setAudit] = useState(true);
  const view = useRef({ zoom, audit });
  view.current = { zoom, audit };
  const [tab, setTab] = useState<UnitTab>("entry");
  const dismissed = useRef(triage.dismissed);
  dismissed.current = triage.dismissed;
  const hasCov = !!model.coverage;
  const [cov, setCov] = useState(false);
  const covOn = useRef(cov);
  covOn.current = cov;
  const [least, setLeast] = useState(false);

  useEffect(() => {
    let alive = true;
    import("@/features/atlas/engine/create-city-scene").then(
      ({ createCityScene }) => {
        if (!alive || !ref.current) return;
        scene.current = createCityScene(ref.current, model, (id) =>
          pick.current(id),
        );
        scene.current.setDismissed(dismissed.current);
        scene.current.setOverlay(covOn.current ? "coverage" : null);
        scene.current.setAudit(view.current.audit);
        scene.current.setZoom(view.current.zoom);
        setReady(true);
      },
    );
    return () => {
      alive = false;
      scene.current?.dispose();
      scene.current = null;
      setReady(false);
    };
  }, [model]);

  useEffect(() => scene.current?.select(selected), [selected]);
  const dismissedKey = [...triage.dismissed].join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-apply only when the dismissed ids change
  useEffect(
    () => scene.current?.setDismissed(dismissed.current),
    [dismissedKey],
  );
  useEffect(() => scene.current?.setZoom(zoom), [zoom]);
  useEffect(() => scene.current?.setOverlay(cov ? "coverage" : null), [cov]);
  useEffect(() => scene.current?.setAudit(audit), [audit]);
  const { entry, steps, step, late } = sim;
  const { captions } = pg;
  useEffect(() => {
    scene.current?.setSim(
      entry ? { entry, steps, step, late, captions } : null,
    );
  }, [entry, steps, step, late, captions]);

  const sys = UNIT_TABS.find((t) => t.value === tab)?.sys ?? [];
  const covOf = (id: string) => pieceCoverage(model, id);
  const units = model.pieces.filter(
    (p) => sys.includes(p.sys) && (!least || covOf(p.id)),
  );
  // least tested first: lowest lines + branches coverage leads
  if (least)
    units.sort((a, b) => (covOf(a.id)?.pct ?? 1) - (covOf(b.id)?.pct ?? 1));

  return (
    <section className="stage city flex flex-col">
      <div ref={ref} className="relative min-h-0 flex-1">
        <div className="absolute top-16 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-2">
          <SegmentedControl
            value={zoom}
            onChange={setZoom}
            options={[
              { value: "city", label: "City" },
              { value: "district", label: "District" },
              { value: "street", label: "Street" },
              { value: "plan", label: "2D", title: "Top-down map" },
            ]}
          />
          <ToggleChip
            label="Audit mode"
            on={audit}
            onToggle={() => setAudit(!audit)}
          />
        </div>
        <div className="absolute top-3 right-3 z-[3]">
          <CityLegend />
        </div>
        {hasCov && (
          <div className="absolute top-3 right-3 z-[3] flex flex-col items-end gap-2">
            <ToggleChip
              label="Coverage"
              on={cov}
              onToggle={() => setCov(!cov)}
            />
            {cov && (
              <div className="covkey hud-label">
                <span className="untested">Untested</span>
                <span className="partial">Partial</span>
                <span className="covered">Covered</span>
              </div>
            )}
          </div>
        )}
        {sim.entry && !pg.stopped && (
          <div className="absolute top-14 left-3 z-[3] w-[300px]">
            <SimPanel model={model} sim={sim} />
          </div>
        )}
        <CityPlayground
          model={model}
          pg={pg}
          scene={scene}
          ready={ready}
          sim={sim}
          selected={selected}
          onSelect={onSelect}
        />
        <div className="pointer-events-none absolute bottom-[92px] left-3 z-[3] text-dim hud-label">
          {zoom === "plan" ? "Drag to pan" : "Drag to orbit"} · scroll to zoom ·
          click a building · / search · Esc clear
        </div>
      </div>
      <div className="relative z-[3] flex-none border-line border-t bg-shell/95 px-3 pt-2 pb-3">
        <div className="flex items-end gap-2">
          <Tabs
            value={tab}
            onChange={setTab}
            options={UNIT_TABS.map((t) => ({ value: t.value, label: t.label }))}
          />
          {hasCov && (
            <div className="ml-auto self-center">
              <ToggleChip
                label="Least tested first"
                on={least}
                onToggle={() => setLeast(!least)}
              />
            </div>
          )}
        </div>
        {tab === "findings" ? (
          <FindingsTab
            model={model}
            triage={triage}
            selected={selected}
            onSelect={onSelect}
          />
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pt-3 pb-1">
            {units.map((p) => {
              const st =
                p.sys === "vulns"
                  ? { tone: "bad" as const, label: p.risk ?? "Finding" }
                  : STATUS[unitStatus(model, p.id)];
              const on = selected === p.id;
              const proto = protocolOf(p);
              const c = covOf(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() =>
                    pg.armed ? pg.drop(p.id) : onSelect(on ? null : p.id)
                  }
                  className={`relative flex flex-none items-center gap-2.5 border px-3 py-2.5 transition-colors ${
                    on
                      ? "border-accent bg-panel"
                      : "border-line bg-tray hover:border-edge"
                  }`}
                >
                  <Brackets />
                  <PieceIcon piece={p} />
                  <Chip tone={st.tone} dot>
                    {st.label}
                  </Chip>
                  {proto && (
                    <span
                      role="img"
                      aria-label={proto.name}
                      title={proto.name}
                      className="plogo"
                      style={{ backgroundImage: `url(${proto.logo})` }}
                    />
                  )}
                  <span className="font-mono text-[13px] text-ink">
                    {unitCode(model, p.id)}
                  </span>
                  <span className="max-w-[160px] truncate font-mono text-muted text-xs">
                    {p.name}
                  </span>
                  {c && (
                    <span
                      title={`Coverage: ${c.lines.hit}/${c.lines.found} lines, ${c.branches.hit}/${c.branches.found} branches`}
                      className={`font-mono text-xs ${c.state === "untested" ? "text-bad" : c.state === "covered" ? "text-ok" : "text-muted"}`}
                    >
                      {pctLabel(c.pct)}
                    </span>
                  )}
                  <span className="border border-line px-1 text-dim text-xs">
                    ↗
                  </span>
                </button>
              );
            })}
            {!units.length && (
              <span className="py-2 text-dim hud-label">Nothing here</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Play / step through what the selected entry point touches, in execution order. */
function SimPanel({ model, sim }: { model: AtlasModel; sim: CitySim }) {
  const at = sim.step;
  const done = at >= sim.steps.length - 1;
  const controls = [
    sim.playing
      ? { label: "Pause", on: true, run: sim.pause }
      : { label: done ? "Replay" : "Play", on: false, run: sim.play },
    { label: "Step", on: false, run: sim.next, off: done },
    { label: "Reset", on: false, run: sim.reset, off: at < 0 },
  ];
  return (
    <Panel
      label={`Simulate · ${model.byId[sim.entry as string].name}`}
      aside={`${String(Math.max(at + 1, 0)).padStart(2, "0")}/${String(sim.steps.length).padStart(2, "0")}`}
    >
      <div className="flex border-line border-b p-2">
        {controls.map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={c.off}
            aria-pressed={c.on}
            onClick={c.run}
            className={`flex-1 border border-line px-3 py-1.5 transition-colors hud-label -ml-px first:ml-0 disabled:opacity-40 ${
              c.on
                ? "bg-accent text-shell"
                : "bg-tray text-muted enabled:hover:bg-soft enabled:hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ol className="max-h-[260px] overflow-auto py-1.5">
        {sim.steps.map(([k, t], i) => (
          <li key={`${i.toString()}${k}${t}`}>
            <button
              type="button"
              onClick={() => sim.seek(i)}
              className={`sim-step ${i < at ? "done" : ""} ${i === at ? "on" : ""} ${sim.late[i] ? "late" : ""}`}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className={`k ${k}`}>{STEP_VERB[k]}</span>
              <span className="truncate">{model.byId[t]?.name ?? t}</span>
              {sim.late[i] && (
                <span title="Write after external call">CEI</span>
              )}
            </button>
          </li>
        ))}
      </ol>
      {sim.late.some(Boolean) && (
        <p className="border-line border-t px-3 py-2 text-bad text-xs">
          Red writes happen after a state-changing external call
          (checks-effects-interactions order not followed).
        </p>
      )}
    </Panel>
  );
}
