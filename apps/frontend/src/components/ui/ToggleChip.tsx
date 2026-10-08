"use client";

/** Filter pill; on = lit dot + bright text, off = dim. */
export function ToggleChip({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-chip px-2.5 text-[12.5px] transition-colors ${
        on ? "bg-hover text-fg" : "bg-raised text-dim hover:text-muted"
      }`}
    >
      <span
        className={`size-2 rounded-full ${on ? "bg-primary" : "border border-dim"}`}
      />
      {label}
    </button>
  );
}
