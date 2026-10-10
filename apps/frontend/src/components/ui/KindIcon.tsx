import type { DisplayKind } from "@/features/trace";
import { PH, PhIcon } from "./PhIcon";

/**
 * Each frame kind in the colour Foundry's own `forge test -vvvv` gives it (read from its ANSI
 * output, docs/ux/trace-view.md): calls green, cheatcodes blue, reverts red, events cyan,
 * staticcalls yellow; delegatecalls pink so a context switch stands out. A Phosphor glyph on a
 * tinted tile, the kind's name as its tooltip.
 */
export const KIND_META: Record<
  DisplayKind,
  { d: string; label: string; tile: string; dot: string }
> = {
  CALL: {
    d: PH.kCall,
    label: "Call",
    tile: "bg-green/12 text-green",
    dot: "bg-green",
  },
  STATICCALL: {
    d: PH.kView,
    label: "View call (staticcall)",
    tile: "bg-yellow/12 text-yellow",
    dot: "bg-yellow",
  },
  DELEGATECALL: {
    d: PH.kDelegate,
    label: "Delegatecall",
    tile: "bg-pink/12 text-pink",
    dot: "bg-pink",
  },
  CALLCODE: {
    d: PH.kDelegate,
    label: "Callcode",
    tile: "bg-pink/12 text-pink",
    dot: "bg-pink",
  },
  CREATE: {
    d: PH.kCreate,
    label: "Create",
    tile: "bg-green/12 text-green",
    dot: "bg-green",
  },
  CREATE2: {
    d: PH.kCreate,
    label: "Create2",
    tile: "bg-green/12 text-green",
    dot: "bg-green",
  },
  EVENT: {
    d: PH.kEvent,
    label: "Event",
    tile: "bg-cyan/12 text-cyan",
    dot: "bg-cyan",
  },
  VM: {
    d: PH.kVm,
    label: "Cheatcode",
    tile: "bg-blue/12 text-blue",
    dot: "bg-blue",
  },
  REVERT: {
    d: PH.kRevert,
    label: "Revert",
    tile: "bg-red/14 text-red",
    dot: "bg-red",
  },
};

export function KindIcon({
  kind,
  size = "md",
}: {
  kind: DisplayKind;
  size?: "sm" | "md" | "lg";
}) {
  const m = KIND_META[kind];
  const dims = {
    sm: "size-[20px] [&>svg]:size-[12px]",
    md: "size-[24px] [&>svg]:size-[14px]",
    lg: "size-[28px] [&>svg]:size-[16px]",
  }[size];
  return (
    <span
      title={m.label}
      className={`grid flex-none place-items-center rounded-[7px] ${dims} ${m.tile}`}
    >
      <PhIcon d={m.d} className="" />
    </span>
  );
}
