"use client";

import { useState } from "react";
import { Brackets, Chip, Tabs, ToggleChip } from "@/components/ui";
import type { AtlasModel, SystemKey, TriageState } from "@/features/atlas";
import { pctLabel, pieceCoverage } from "@/features/atlas/utils/coverage";
import { protocolOf } from "@/features/atlas/utils/protocols";
import { unitCode, unitStatus } from "@/features/atlas/utils/units";
import { FindingsTab } from "./FindingsTab";
import { PieceIcon } from "./PieceIcon";

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

/** Unit list under the Lab canvas: entry points / storage / external / findings (triage + report), least tested first. */
export function UnitTray({
  model,
  selected,
  onSelect,
  triage,
}: {
  model: AtlasModel;
  selected: string | null;
  onSelect: (id: string | null) => void;
  triage: TriageState;
}) {
  const [tab, setTab] = useState<UnitTab>("entry");
  const hasCov = !!model.coverage;
  const [least, setLeast] = useState(false);

  const sys = UNIT_TABS.find((t) => t.value === tab)?.sys ?? [];
  const covOf = (id: string) => pieceCoverage(model, id);
  const units = model.pieces.filter(
    (p) => sys.includes(p.sys) && (!least || covOf(p.id)),
  );
  // least tested first: lowest lines + branches coverage leads
  if (least)
    units.sort((a, b) => (covOf(a.id)?.pct ?? 1) - (covOf(b.id)?.pct ?? 1));

  return (
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
                onClick={() => onSelect(on ? null : p.id)}
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
  );
}
