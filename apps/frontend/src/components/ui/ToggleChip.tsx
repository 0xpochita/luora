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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-2xl border border-trayline bg-card px-3 py-1.5 font-medium text-[12.5px] shadow-sh1 transition-opacity ${
        on ? "" : "opacity-45"
      }`}
    >
      <span className={`size-2 rounded-full ${on ? "bg-ok" : "bg-dim"}`} />
      {label}
    </button>
  );
}
