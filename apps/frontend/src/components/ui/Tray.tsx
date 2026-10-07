import type { ReactNode } from "react";

/** Genie's nested surface: soft grey tray (r-32) around white cards (r-24). */
export function Tray({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[32px] border-[1.5px] border-trayline bg-tray p-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function TrayCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-card shadow-sh1 ${className}`}>
      {children}
    </div>
  );
}
