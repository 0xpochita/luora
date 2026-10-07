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
      className={`chamfer p-px [--cut:7px] ${on ? "bg-edge" : "bg-line"}`}
    >
      <span
        className={`inline-flex chamfer items-center gap-2 whitespace-nowrap bg-shell px-2.5 py-1.5 transition-colors hud-label [--cut:7px] ${
          on ? "text-ink" : "text-dim"
        }`}
      >
        <span
          className={`size-2 border ${on ? "border-accent bg-accent" : "border-dim"}`}
        />
        {label}
      </span>
    </button>
  );
}
