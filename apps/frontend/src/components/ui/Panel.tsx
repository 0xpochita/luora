import type { ReactNode } from "react";
import { TONE_DOT, type Tone } from "./tone";

/**
 * Graphite gradient card. `label` + `aside` make the title row: inside the card by default,
 * above it with `titleAbove` (node-card anatomy: "● Title"). `inset` wraps the body in the
 * nested inner card (8px in, radius 12); `glow` adds the soft pink/blue glow behind the top edge —
 * only for the one selected / running card. The title dot is white unless a semantic `dot` tone is given.
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
      className={`flex items-center gap-2 text-[14px] ${titleAbove ? "px-1 pb-2.5" : "px-4 pt-3.5 pb-2.5"}`}
    >
      <span
        className={`size-1.5 flex-none rounded-full ${dot && dot !== "neutral" ? TONE_DOT[dot] : "bg-fg"}`}
      />
      <span className="truncate font-medium text-fg">{label}</span>
      {aside != null && (
        <span className="ml-auto whitespace-nowrap text-[12.5px] text-dim">
          {aside}
        </span>
      )}
    </header>
  );
  const body = inset ? (
    <div className="m-2 flex min-h-0 flex-1 flex-col rounded-inner border border-border bg-inner-grad">
      {children}
    </div>
  ) : (
    children
  );
  const card = `flex min-h-0 flex-col rounded-card border border-border bg-card-grad shadow-soft ${glow ? "glow-top" : ""}`;

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
