"use client";

/** Underline tabs: BRIEF / UNIT MAP / SETUP. */
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
    <div role="tablist" className={`flex ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2 transition-colors hud-label ${
            o.value === value
              ? "border-accent text-ink"
              : "border-transparent text-dim hover:text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
