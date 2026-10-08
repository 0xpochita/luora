import type { ReactNode } from "react";
import { TONE_DOT, type Tone } from "./tone";

const TONES: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  ok: "bg-green/10 text-green",
  bad: "bg-red/10 text-red",
  warn: "bg-yellow/10 text-yellow",
  info: "bg-blue/10 text-blue",
  violet: "bg-violet/10 text-violet",
  solid: "bg-primary text-primary-fg",
};

/** Soft pill for status / counts; `dot` adds a tone-coloured dot. */
export function Chip({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[12px] ${TONES[tone]} ${className}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  );
}
