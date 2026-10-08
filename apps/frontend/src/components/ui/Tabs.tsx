"use client";

import { tile } from "./tile";

/** Row of separate rounded tiles with gaps; the active one is solid white. Used for every tab bar. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className = "",
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex items-center gap-1.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          title={o.title}
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${tile(o.value === value)} ${size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-4 text-[14px]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { Tabs as TileGroup };
