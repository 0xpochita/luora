import type { ReactNode } from "react";

/** Grey Genie shell; pages draw their own white r-32 panels on top. */
export function MainShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell font-sans text-[13px] text-ink">
      {children}
    </div>
  );
}
