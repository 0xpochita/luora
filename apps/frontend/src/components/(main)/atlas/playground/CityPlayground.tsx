"use client";

import { type RefObject, useEffect, useState } from "react";
import type { AtlasModel, CitySim } from "@/features/atlas";
import type { CityScene } from "@/features/atlas/engine/create-city-scene";
import type { PreviewTone } from "@/features/atlas/engine/playground-layer";
import type { Playground } from "@/features/atlas/hooks/usePlayground";
import { findingsAt, type Verdict } from "@/features/atlas/utils/playground";
import { CommandCard } from "./CommandCard";
import { HoverCard } from "./HoverCard";
import { Minimap } from "./Minimap";
import { PlayDock } from "./PlayDock";
import { PlayResult } from "./PlayResult";
import { ResourceBar } from "./ResourceBar";
import "./playground.css";

export const toneOf = (v: Verdict | null): PreviewTone | null =>
  !v ? null : v.kind === "reach" ? "reach" : v.access.pass ? "call" : "pass";

/**
 * USDC playground HUD over the City, RTS style: resource bar, token dock, command card, minimap,
 * hover cards and the run result. The mission is to explore one function call at a time.
 */
export function CityPlayground({
  model,
  pg,
  scene,
  ready,
  sim,
  selected,
  onSelect,
}: {
  model: AtlasModel;
  pg: Playground;
  scene: RefObject<CityScene | null>;
  ready: boolean;
  sim: CitySim;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    const s = ready ? scene.current : null;
    s?.onHover((id, x, y) => setHover(id ? { id, x, y } : null));
    return () => s?.onHover(null);
  }, [ready, scene]);
  // the camera flies on selection: whatever was under the pointer is stale
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on selection change only
  useEffect(() => setHover(null), [selected]);

  // move-order preview on the building under the dragged / picked token
  const target = pg.drag ? pg.drag.id : pg.armed ? (hover?.id ?? null) : null;
  const tone = toneOf(pg.preview(target));
  useEffect(() => {
    if (ready) scene.current?.playground.preview(target, tone);
  }, [ready, scene, target, tone]);
  const dragging = !!pg.drag;
  useEffect(() => {
    if (ready) scene.current?.setDragging(dragging);
  }, [ready, scene, dragging]);
  const unit = pg.armed || dragging || !!pg.active;
  useEffect(() => {
    if (ready) scene.current?.playground.setUnit(unit);
  }, [ready, scene, unit]);

  // access-control stop at the gate
  const v = pg.verdict;
  const revert =
    v?.kind === "call" && !v.access.pass
      ? {
          entry: v.entry,
          gate: v.access.guard?.id ?? null,
          head: `${v.access.caption} · ACCESS CONTROL OK`,
          code: v.access.guard
            ? `L${v.access.guard.line + 1}  ${model.lines[v.access.guard.line]?.trim()}`
            : "",
        }
      : null;
  const revertKey = revert ? `${revert.entry}|${revert.head}` : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when the stopped call changes
  useEffect(() => {
    if (ready) scene.current?.playground.revert(revert);
  }, [ready, scene, revertKey]);

  // findings on the path light up as the replay reaches them
  const entry = v?.kind === "call" && pg.passed ? v.entry : null;
  const lit = entry ? [...findingsAt(model, entry, sim.step)] : [];
  const litKey = lit.map((f) => model.lesion[f]).join();
  useEffect(() => {
    if (ready)
      scene.current?.playground.setLit(
        new Set(litKey ? litKey.split(",") : []),
      );
  }, [ready, scene, litKey]);

  const card = pg.drag ?? (hover ? { ...hover } : null);
  return (
    <>
      <div className="absolute top-3 left-3 z-[4]">
        <ResourceBar pg={pg} />
      </div>
      {pg.verdict && (
        <div className="pg-result absolute top-14 right-3 bottom-[168px] z-[4] flex w-[330px] flex-col">
          <PlayResult
            model={model}
            pg={pg}
            sim={sim}
            lit={lit}
            onSelect={onSelect}
          />
        </div>
      )}
      <div className="absolute bottom-3 left-3 z-[4]">
        <PlayDock pg={pg} scene={scene} />
      </div>
      <div className="absolute right-3 bottom-3 z-[4] flex items-end gap-2">
        <CommandCard model={model} pg={pg} selected={selected} />
        {ready && (
          <Minimap
            model={model}
            scene={scene}
            selected={selected}
            onSelect={onSelect}
          />
        )}
      </div>
      {card?.id && (
        <HoverCard
          model={model}
          id={card.id}
          x={card.x}
          y={card.y}
          verdict={pg.drag || pg.armed ? pg.preview(card.id) : null}
          caller={pg.caller}
        />
      )}
    </>
  );
}
