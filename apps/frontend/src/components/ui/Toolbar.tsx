import type { ReactNode } from "react";

/** Floating rounded container for tiles / icon buttons. Position it yourself (absolute, flex…). */
export function Toolbar({
  children,
  vertical = false,
  className = "",
}: {
  children: ReactNode;
  vertical?: boolean;
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={`flex gap-1.5 rounded-card border border-border bg-card-grad p-1.5 shadow-soft ${vertical ? "flex-col" : "items-center"} ${className}`}
    >
      {children}
    </div>
  );
}
