import type { ReactNode } from "react";
import { TONE_DOT, type Tone } from "./tone";

/** Graphite pills; the tone only colours the dot (DESIGN.md: colour = tiny semantic dots). */
const TONES: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  ok: "bg-raised text-text",
  bad: "bg-raised text-text",
  warn: "bg-raised text-text",
  info: "bg-raised text-text",
  solid: "bg-primary text-primary-fg",
};

/** Soft graphite pill for status / counts; `dot` adds the tone-coloured dot. */
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
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[12.5px] ${TONES[tone]} ${className}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  );
}
