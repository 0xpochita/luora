import type { ReactNode } from "react";

const CORNERS = [
  "-top-px -left-px border-t border-l",
  "-top-px -right-px border-t border-r",
  "-bottom-px -left-px border-b border-l",
  "-bottom-px -right-px border-b border-r",
];

/** L-shaped ticks on the corners; drop inside any `relative` box. `chamfered` skips top-right. */
export function Brackets({ chamfered = false }: { chamfered?: boolean }) {
  // inside a clip-path box the -1px offset would be clipped away, so sit flush instead
  const corners = chamfered
    ? CORNERS.filter((_, i) => i !== 1).map((c) => c.replaceAll("-px", "-0"))
    : CORNERS;
  return corners.map((c) => (
    <i
      key={c}
      aria-hidden="true"
      className={`pointer-events-none absolute size-2.5 border-tick ${c}`}
    />
  ));
}

/** HUD panel: thin border with a chamfered top-right corner, bracket ticks, optional `LABEL ……… aside` header. */
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
    <section
      className={`relative flex flex-col chamfer bg-line p-px [--cut:14px] ${className}`}
    >
      <Brackets chamfered />
      <div className="flex min-h-0 flex-1 flex-col chamfer bg-panel [--cut:14px]">
        {label != null && (
          <header className="flex items-center gap-2 border-line border-b px-3 py-2 text-muted hud-label">
            <span className="size-1.5 bg-accent" />
            {label}
            {aside != null && <span className="ml-auto text-dim">{aside}</span>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
