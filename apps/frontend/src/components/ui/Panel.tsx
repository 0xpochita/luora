import type { ReactNode } from "react";

const CORNERS = [
  "-top-px -left-px border-t border-l",
  "-top-px -right-px border-t border-r",
  "-bottom-px -left-px border-b border-l",
  "-bottom-px -right-px border-b border-r",
];

/** L-shaped ticks on all four corners; drop inside any `relative` box. */
export function Brackets() {
  return CORNERS.map((c) => (
    <i
      key={c}
      aria-hidden="true"
      className={`pointer-events-none absolute size-2.5 border-tick ${c}`}
    />
  ));
}

/** Sharp HUD panel: thin border, bracket corners, optional `LABEL ……… aside` header. */
export function Panel({
  label,
  aside,
  children,
  className = "",
}: {
  label?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative border border-line bg-panel ${className}`}>
      <Brackets />
      {label != null && (
        <header className="flex items-center gap-2 border-line border-b px-3 py-2 text-muted hud-label">
          <span className="size-1.5 bg-accent" />
          {label}
          {aside != null && <span className="ml-auto text-dim">{aside}</span>}
        </header>
      )}
      {children}
    </section>
  );
}
