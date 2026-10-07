import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-panel text-muted shadow-sh1",
  ok: "bg-[color-mix(in_srgb,var(--ok)_14%,var(--card))] text-ok",
  bad: "bg-[color-mix(in_srgb,var(--bad)_14%,var(--card))] text-bad",
  soft: "bg-soft text-ink",
} as const;

export function Pill({
  children,
  tone = "neutral",
  mono = false,
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] ${
        mono ? "font-mono" : "font-medium"
      } ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
