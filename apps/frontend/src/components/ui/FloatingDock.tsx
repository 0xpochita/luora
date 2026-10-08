import type { ReactNode } from "react";

/** Graphite bottom dock (prompt area + row of tiles). */
export function FloatingDock({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-card border border-border bg-card-grad p-2.5 shadow-float ${className}`}
    >
      {children}
    </div>
  );
}
