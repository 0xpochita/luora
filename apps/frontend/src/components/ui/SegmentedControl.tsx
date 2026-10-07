"use client";

/** Square segmented control; the active segment is filled white. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex border border-line bg-tray">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-w-8 px-3 py-1.5 transition-colors hud-label ${
            o.value === value
              ? "bg-accent text-shell"
              : "text-muted hover:bg-soft hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
