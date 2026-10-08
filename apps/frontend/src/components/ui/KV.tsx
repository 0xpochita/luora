import type { ReactNode } from "react";

/** Key / value row: sans key on the left, mono value on the right. */
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
      <span className="text-[12px] text-muted">{k}</span>
      <span className="ml-auto truncate font-mono text-xs">{children}</span>
    </div>
  );
}
