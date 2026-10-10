import type { DisplayKind } from "@/features/trace";

/**
 * A frame's kind as words, never an icon (docs/ux/trace-view.md): an outlined mono badge as
 * Phalcon Explorer's invocation flow writes it (CALL, STATICCALL, DELEGATECALL …), in the colour
 * Foundry's own `forge test -vvvv` gives that kind (calls green, cheatcodes blue, reverts red,
 * events cyan, staticcalls yellow; delegatecalls pink so a context switch stands out).
 */
export const KIND_META: Record<
  DisplayKind,
  { label: string; title: string; badge: string }
> = {
  CALL: {
    label: "CALL",
    title: "Call",
    badge: "border-green/35 bg-green/[.08] text-green",
  },
  STATICCALL: {
    label: "STATICCALL",
    title: "Read-only call",
    badge: "border-yellow/35 bg-yellow/[.08] text-yellow",
  },
  DELEGATECALL: {
    label: "DELEGATECALL",
    title: "Delegatecall: runs another contract's code in this one's storage",
    badge: "border-pink/40 bg-pink/[.09] text-pink",
  },
  CALLCODE: {
    label: "CALLCODE",
    title: "Callcode",
    badge: "border-pink/40 bg-pink/[.09] text-pink",
  },
  CREATE: {
    label: "CREATE",
    title: "Contract creation",
    badge: "border-green/35 bg-green/[.08] text-green",
  },
  CREATE2: {
    label: "CREATE2",
    title: "Contract creation (CREATE2)",
    badge: "border-green/35 bg-green/[.08] text-green",
  },
  EVENT: {
    label: "EVENT",
    title: "Emitted event",
    badge: "border-cyan/35 bg-cyan/[.08] text-cyan",
  },
  VM: {
    label: "CHEATCODE",
    title: "Foundry cheatcode (vm.*)",
    badge: "border-blue/35 bg-blue/[.08] text-blue",
  },
  REVERT: {
    label: "REVERT",
    title: "This call reverted",
    badge: "border-red/45 bg-red/[.1] text-red",
  },
};

export function KindBadge({
  kind,
  size = "md",
}: {
  kind: DisplayKind;
  size?: "sm" | "md";
}) {
  const m = KIND_META[kind];
  return (
    <span
      title={m.title}
      className={`inline-flex flex-none items-center justify-center rounded-[6px] border font-mono tracking-[0.02em] ${
        size === "sm"
          ? "h-[18px] px-1.5 text-[10px]"
          : "h-[22px] min-w-[96px] px-2 text-[10.5px]"
      } ${m.badge}`}
    >
      {m.label}
    </span>
  );
}
