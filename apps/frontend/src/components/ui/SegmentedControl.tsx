"use client";

/** Compact choice inside one dark tray; the active segment is a white tile. */
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
    <div className="inline-flex gap-1 rounded-tile bg-inset p-1 shadow-[inset_0_0_0_1px_var(--border)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-7 min-w-8 rounded-[7px] px-2.5 text-[12.5px] transition-colors ${
            o.value === value
              ? "bg-primary text-primary-fg shadow-soft"
              : "text-muted hover:bg-hover hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
