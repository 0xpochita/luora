/** Striped progress bar, 0–1. */
export function Meter({
  value,
  tone = "text-tick",
  className = "w-16",
}: {
  value: number;
  tone?: string;
  className?: string;
}) {
  return (
    <i className={`block h-1.5 flex-none border border-line p-px ${className}`}>
      <b
        className={`block h-full hud-stripes ${tone}`}
        style={{ width: `${Math.max(2, Math.min(1, value) * 100)}%` }}
      />
    </i>
  );
}
