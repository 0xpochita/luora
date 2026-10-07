import type { ReactNode } from "react";

const TONES = {
  neutral: "border-line text-muted",
  ok: "border-ok/50 text-ok",
  bad: "border-bad/60 text-bad",
  solid: "border-accent bg-accent text-shell",
} as const;

/** Small square status chip: `● ACTIVE`. */
export function Chip({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] hud-label ${TONES[tone]} ${className}`}
    >
      {dot && <span className="size-1.5 bg-current" />}
      {children}
    </span>
  );
}
