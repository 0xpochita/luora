"use client";

import { motion } from "motion/react";
import { type ReactNode, useId } from "react";
import { SLIDE } from "./motion";

const BASE =
  "relative isolate inline-flex items-center justify-center gap-2 rounded-tile whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/25";

/** Row of separate rounded tiles with gaps; the active one is solid white, and the white slides between them. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className = "",
}: {
  value: T;
  options: { value: T; label: string; title?: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" className={`flex items-center gap-1.5 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            title={o.title}
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`${BASE} gap-1.5 ${on ? "text-primary-fg" : "bg-raised text-muted hover:bg-hover hover:text-fg"} ${size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-4 text-[13px]"}`}
          >
            {on && (
              <motion.span
                layoutId={`${id}-tab`}
                transition={SLIDE}
                className="absolute inset-0 -z-10 rounded-tile bg-primary shadow-soft"
              />
            )}
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs as TileGroup };
