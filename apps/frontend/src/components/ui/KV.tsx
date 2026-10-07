import type { ReactNode } from "react";

/** `POWER ……… 80%` row. */
export function KV({
  k,
  children,
  className = "",
}: {
  k: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-3 py-1 ${className}`}>
      <span className="text-dim hud-label">{k}</span>
      <span className="ml-auto truncate font-mono text-xs">{children}</span>
    </div>
  );
}
