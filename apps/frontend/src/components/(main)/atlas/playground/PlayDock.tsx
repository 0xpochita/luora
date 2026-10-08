"use client";

import { type RefObject, useRef } from "react";
import { Brackets } from "@/components/ui";
import type { CityScene } from "@/features/atlas/engine/create-city-scene";
import type { Playground } from "@/features/atlas/hooks/usePlayground";

/**
 * Token dock: drag the USDC token onto a building, or click it (Enter) and then click a building /
 * press Enter on a unit card. Amount (6 decimals) and the role to call as live here too.
 */
export function PlayDock({
  pg,
  scene,
}: {
  pg: Playground;
  scene: RefObject<CityScene | null>;
}) {
  const start = useRef<[number, number] | null>(null);
  const moved = useRef(false);
  const out = !!pg.active || pg.armed || !!pg.drag;

  return (
    <div className="pg-dock relative flex items-center gap-3 border border-line bg-shell/90 p-2 pr-3">
      <Brackets />
      <button
        type="button"
        aria-pressed={pg.armed}
        aria-label={
          pg.armed
            ? "USDC token picked: click a building or press Enter on a unit card (Esc cancels)"
            : "Pick up the USDC token"
        }
        title="Drag onto a building, or click then click a building"
        className={`pg-token ${out ? "out" : ""} ${pg.armed ? "armed" : ""}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start.current = [e.clientX, e.clientY];
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          if (
            !moved.current &&
            Math.hypot(e.clientX - s[0], e.clientY - s[1]) < 6
          )
            return;
          moved.current = true;
          const id = scene.current?.pickAt(e.clientX, e.clientY) ?? null;
          pg.setDrag({ id, x: e.clientX, y: e.clientY });
        }}
        onPointerUp={(e) => {
          start.current = null;
          if (!moved.current) return;
          pg.drop(scene.current?.pickAt(e.clientX, e.clientY) ?? null);
        }}
        onPointerCancel={() => {
          start.current = null;
          pg.setDrag(null);
        }}
        onClick={() => {
          if (!moved.current) pg.setArmed(!pg.armed);
        }}
      >
        <span className="pg-coin" />
      </button>
      <div className="grid gap-1.5">
        <label className="flex items-center gap-2">
          <span className="w-12 text-dim hud-label">Amount</span>
          <input
            id="pg-amount"
            inputMode="decimal"
            value={pg.amount}
            onChange={(e) => pg.setAmount(e.target.value)}
            aria-invalid={!pg.amountOk}
            className={`w-[104px] border bg-tray px-2 py-1 text-right font-mono text-xs text-ink outline-none focus:border-accent ${pg.amountOk ? "border-line" : "border-bad"}`}
          />
          <span className="font-mono text-[11px] text-muted">USDC</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-12 text-dim hud-label">Call as</span>
          <select
            value={pg.caller}
            onChange={(e) => pg.setCaller(e.target.value)}
            className="w-[104px] border border-line bg-tray px-1.5 py-1 font-mono text-xs text-ink outline-none focus:border-accent"
          >
            {pg.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="font-mono text-[11px] text-dim">6 dec</span>
        </label>
      </div>
      <span className="pg-hint text-dim hud-label">
        {pg.armed
          ? "Click a building · Esc cancels"
          : out
            ? "X returns the token"
            : "Drag the token onto a building"}
      </span>
    </div>
  );
}
