/** Rounded progress bar, 0–1. Monochrome fill by default; `tone` (a text colour class) only for red = bad. */
export function Meter({
  value,
  tone = "text-[#d4d4d8]",
  className = "w-16",
}: {
  value: number;
  tone?: string;
  className?: string;
}) {
  return (
    <i
      className={`block h-1.5 flex-none overflow-hidden rounded-full bg-[#151517] shadow-[inset_0_0_0_1px_var(--border)] ${className}`}
    >
      <b
        className={`block h-full rounded-full bg-current ${tone}`}
        style={{ width: `${Math.max(2, Math.min(1, value) * 100)}%` }}
      />
    </i>
  );
}
