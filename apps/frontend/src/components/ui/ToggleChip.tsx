"use client";

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
      className={`inline-flex items-center gap-2 whitespace-nowrap border px-2.5 py-1.5 transition-colors hud-label ${
        on ? "border-edge text-ink" : "border-line text-dim"
      }`}
    >
      <span
        className={`size-2 border ${on ? "border-accent bg-accent" : "border-dim"}`}
      />
      {label}
    </button>
  );
}
