/** Rounded progress bar, 0–1. `tone` is a text colour class; the fill uses currentColor. */
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
    <i
      className={`block h-1.5 flex-none overflow-hidden rounded-full bg-inset ${className}`}
    >
      <b
        className={`block h-full rounded-full bg-current ${tone}`}
        style={{ width: `${Math.max(2, Math.min(1, value) * 100)}%` }}
      />
    </i>
  );
}
