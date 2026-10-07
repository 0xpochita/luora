"use client";

/** Folder tabs with a chamfered top-right corner; the active tab opens into the panel below. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex items-end gap-1.5 border-line border-b ${className}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`group -mb-px chamfer p-px pb-0 [--cut:9px] ${on ? "bg-edge" : "bg-line"}`}
          >
            <span
              className={`block chamfer whitespace-nowrap px-4 pt-2 pb-2.5 font-mono text-[12.5px] tracking-wide transition-colors [--cut:9px] ${
                on
                  ? "bg-panel text-ink"
                  : "bg-shell text-dim group-hover:text-muted"
              }`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
