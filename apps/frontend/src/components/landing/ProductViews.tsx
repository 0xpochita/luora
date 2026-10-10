"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useMemo } from "react";
import { useStepSim, useTriage } from "@/features/atlas";
import type { AtlasData } from "@/features/atlas/types";
import { contractGraph } from "@/features/atlas/utils/lab-graph";
import { createAtlasModel } from "@/features/atlas/utils/model";
import type { Frame } from "@/features/trace";
import { LabGraph } from "./LabGraph";
import type { ViewId } from "./ProductTabs";
import type { LabDemo } from "./stats";
import "@/components/(main)/atlas/atlas.css";

// Lab and Scenario come with this chunk; the others load as the tabs come up to them
const FindingsTab = dynamic(() =>
  import("@/components/(main)/atlas/FindingsTab").then((m) => m.FindingsTab),
);
const FlowView = dynamic(() =>
  import("@/components/(main)/atlas/flow/FlowView").then((m) => m.FlowView),
);
const MapView = dynamic(() =>
  import("@/components/(main)/atlas/map/MapView").then((m) => m.MapView),
);
const TraceRow = dynamic(() =>
  import("@/components/(main)/trace/TraceRow").then((m) => m.TraceRow),
);

/** the ProductTabs views themselves, built on the sample atlas once it has arrived (atlas.ts) */
export function Views({
  atlas,
  frames,
  scenario,
  at,
  seen,
  ids,
}: {
  /** the view ids in tab order (ProductTabs VIEWS) */
  ids: ViewId[];
  atlas: AtlasData;
  frames: Frame[];
  scenario: LabDemo | null;
  at: number;
  seen: ReadonlySet<number>;
}) {
  const model = useMemo(() => createAtlasModel(atlas), [atlas]);
  const graph = useMemo(() => contractGraph(model), [model]);
  const sim = useStepSim(model, null);
  const triage = useTriage(model.contract);
  const maxGas = Math.max(1, ...frames.map((f) => f.gas ?? 0));
  const none = () => {};
  const content: Record<ViewId, ReactNode> = {
    lab: (
      <div className="dot-grid absolute inset-0">
        <div className="absolute top-14 left-16">
          <LabGraph nodes={graph.nodes} wires={graph.wires} />
        </div>
      </div>
    ),
    scenario: (
      <div className="dot-grid absolute inset-0">
        {scenario && (
          // the whole scenario has to stay inside the tilted frame, so it runs a little smaller
          <div className="absolute top-14 left-12 origin-top-left scale-[0.78]">
            <LabGraph
              nodes={scenario.nodes}
              wires={scenario.wires}
              runs={scenario.runs}
              fields={scenario.fields}
            />
          </div>
        )}
      </div>
    ),
    trace: (
      <div className="dot-grid absolute inset-0 p-10">
        <div className="w-[820px] rounded-card border border-border bg-card-grad p-2 shadow-soft">
          {frames.map((f, i) => (
            <TraceRow
              key={`${i}${f.fn}`}
              index={i}
              frame={f}
              maxGas={maxGas}
              selected={i === 1}
              onSelect={none}
              fold={(frames[i + 1]?.d ?? -1) > f.d ? "open" : null}
              onFold={none}
            />
          ))}
        </div>
      </div>
    ),
    flow: (
      <div className="atlas absolute inset-0">
        <section className="stage h-full">
          <FlowView model={model} selected={null} onSelect={none} sim={sim} />
        </section>
      </div>
    ),
    map: (
      <div className="atlas absolute inset-0">
        <section className="stage h-full">
          <MapView
            model={model}
            selected={null}
            onSelect={none}
            triage={triage}
          />
        </section>
      </div>
    ),
    findings: (
      <div className="dot-grid absolute inset-0 p-10">
        <div className="w-[880px]">
          <FindingsTab
            model={model}
            triage={triage}
            selected={model.findings[0]?.id ?? null}
            onSelect={none}
          />
        </div>
      </div>
    ),
  };

  return (
    <>
      {ids.map((id, i) => (
        <div
          key={id}
          inert
          aria-hidden={i !== at}
          className={`absolute inset-0 transition-opacity ease-out motion-reduce:transition-none ${
            i === at
              ? "opacity-100 delay-200 duration-300"
              : "opacity-0 duration-200"
          }`}
        >
          {seen.has(i) && content[id]}
        </div>
      ))}
    </>
  );
}
