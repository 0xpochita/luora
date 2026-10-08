import type { ReactNode } from "react";

const SIDES = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
} as const;

/** CSS-only hover/focus tooltip around any element. */
export function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: ReactNode;
  side?: keyof typeof SIDES;
  children: ReactNode;
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-chip border border-border bg-raised px-2 py-1 text-[12.5px] text-fg opacity-0 shadow-float transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${SIDES[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
