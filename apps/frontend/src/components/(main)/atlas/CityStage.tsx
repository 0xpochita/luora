"use client";

import { useEffect, useRef, useState } from "react";
import { Brackets, Chip, SegmentedControl, Tabs } from "@/components/ui";
import type { AtlasModel, SystemKey } from "@/features/atlas";
import type {
  CityScene,
  CityZoom,
} from "@/features/atlas/engine/create-city-scene";
import { protocolOf } from "@/features/atlas/utils/protocols";
import { unitCode, unitStatus } from "@/features/atlas/utils/units";

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
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scene = useRef<CityScene | null>(null);
  const pick = useRef(onSelect);
  pick.current = onSelect;
  const [zoom, setZoom] = useState<CityZoom>("city");
  const [tab, setTab] = useState<UnitTab>("entry");

  useEffect(() => {
    let alive = true;
    import("@/features/atlas/engine/create-city-scene").then(
      ({ createCityScene }) => {
        if (!alive || !ref.current) return;
        scene.current = createCityScene(ref.current, model, (id) =>
          pick.current(id),
        );
      },
    );
    return () => {
      alive = false;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [model]);

  useEffect(() => scene.current?.select(selected), [selected]);
  useEffect(() => scene.current?.setZoom(zoom), [zoom]);

  const sys = UNIT_TABS.find((t) => t.value === tab)?.sys ?? [];
  const units = model.pieces.filter((p) => sys.includes(p.sys));

  return (
    <section className="stage city flex flex-col">
      <div ref={ref} className="relative min-h-0 flex-1">
        <div className="absolute top-3 left-1/2 z-[3] -translate-x-1/2">
          <SegmentedControl
            value={zoom}
            onChange={setZoom}
            options={[
              { value: "city", label: "City" },
              { value: "district", label: "District" },
              { value: "street", label: "Street" },
            ]}
          />
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 z-[3] text-dim hud-label">
          Drag to orbit · scroll to zoom · click a building
        </div>
      </div>
      <div className="relative z-[3] flex-none border-line border-t bg-shell/95 px-3 pt-2 pb-3">
        <Tabs
          value={tab}
          onChange={setTab}
          options={UNIT_TABS.map((t) => ({ value: t.value, label: t.label }))}
        />
        <div className="flex gap-2.5 overflow-x-auto pt-3 pb-1">
          {units.map((p) => {
            const st =
              p.sys === "vulns"
                ? { tone: "bad" as const, label: p.risk ?? "Finding" }
                : STATUS[unitStatus(model, p.id)];
            const on = selected === p.id;
            const proto = protocolOf(p);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => onSelect(on ? null : p.id)}
                className={`relative flex flex-none items-center gap-2.5 border px-3 py-2.5 transition-colors ${
                  on
                    ? "border-accent bg-panel"
                    : "border-line bg-tray hover:border-edge"
                }`}
              >
                <Brackets />
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
      </div>
    </section>
  );
}
