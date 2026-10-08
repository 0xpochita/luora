import type { ReactNode } from "react";
import { TONE_DOT, type Tone } from "./tone";

/**
 * Rounded dark card. `label` + `aside` make a soft header row inside the card;
 * `titleAbove` moves that row above the card (node-card anatomy); `inset` wraps the body
 * in a nested inner card (5px in, radius 16 − 5 = 11); `glow` adds the violet→pink border.
 */
export function Panel({
  label,
  aside,
  dot,
  titleAbove = false,
  inset = false,
  glow = false,
  children,
  className = "",
}: {
  label?: ReactNode;
  aside?: ReactNode;
  dot?: Tone;
  titleAbove?: boolean;
  inset?: boolean;
  glow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const header = label != null && (
    <header
      className={`flex items-center gap-2 text-[13px] text-muted ${titleAbove ? "px-1 pb-1.5" : "px-3.5 pt-3 pb-2"}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${TONE_DOT[dot]}`} />}
      <span className="truncate text-fg">{label}</span>
      {aside != null && (
        <span className="ml-auto whitespace-nowrap text-[12px] text-dim">
          {aside}
        </span>
      )}
    </header>
  );
  const body = inset ? (
    <div className="m-[5px] flex min-h-0 flex-1 flex-col rounded-inner bg-inset">
      {children}
    </div>
  ) : (
    children
  );
  const card = `flex min-h-0 flex-col rounded-card border border-border bg-surface shadow-soft ${glow ? "glow-border" : ""}`;

  if (titleAbove)
    return (
      <section className={`flex min-h-0 flex-col ${className}`}>
        {header}
        <div className={`flex-1 ${card}`}>{body}</div>
      </section>
    );
  return (
    <section className={`${card} ${className}`}>
      {header}
      {body}
    </section>
  );
}

export { Panel as Card };
