"use client";

import { motion } from "motion/react";
import { type ReactNode, useId } from "react";
import { SLIDE } from "./motion";

/** Compact choice inside one dark tray; the active segment is a white tile that slides between options. Options may carry an icon. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "sm",
}: {
  value: T;
  options: { value: T; label: string; title?: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className="inline-flex gap-1 rounded-tile bg-inset p-1 shadow-[inset_0_0_0_1px_var(--border)]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          title={o.title}
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative isolate inline-flex items-center gap-1.5 rounded-[7px] transition-colors ${
            size === "md"
              ? "h-8 px-3 text-[13px]"
              : "h-7 min-w-8 px-2.5 text-[12.5px]"
          } ${
            o.value === value
              ? "text-primary-fg"
              : "text-muted hover:bg-hover hover:text-fg"
          }`}
        >
          {o.value === value && (
            <motion.span
              layoutId={`${id}-seg`}
              transition={SLIDE}
              className="absolute inset-0 -z-10 rounded-[7px] bg-primary shadow-soft"
            />
          )}
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
