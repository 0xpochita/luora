import type { ReactNode } from "react";
import { Chip, LogoMark } from "@/components/ui";
import { RouteTabs } from "./RouteTabs";

/** App frame shared by every route: floating brand + route tiles over the dot-grid canvas. */
export function MainShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden font-sans text-[13px] text-fg dot-grid">
      <header className="flex flex-none items-center gap-1.5 px-3 pt-3 pb-2">
        <LogoMark />
        <span className="mr-2 ml-1 font-medium text-[16px] text-fg">luora</span>
        <RouteTabs />
        <div className="ml-auto flex items-center gap-1.5">
          <Chip>Audit console</Chip>
          <Chip tone="ok" dot>
            Defensive
          </Chip>
        </div>
      </header>
      {children}
    </div>
  );
}
