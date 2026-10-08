import type { ReactNode } from "react";

/** Glassy bottom dock with the violet→pink glow border (prompt area + row of icon tiles). */
export function FloatingDock({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glow-border flex flex-col gap-2 rounded-card bg-surface/80 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_48px_-12px_rgba(167,139,250,0.35)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
