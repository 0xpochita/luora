import type { ReactNode } from "react";
import { Chip, LogoMark } from "@/components/ui";
import { RouteTabs } from "./RouteTabs";

/** HUD frame shared by every route: brand, route tabs, status; pages fill the rest. */
export function MainShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell font-sans text-[13px] text-ink">
      <header className="flex h-11 flex-none items-center border-line border-b bg-tray">
        <div className="flex h-full items-center gap-2.5 border-line border-r px-4 font-mono font-semibold text-[13px] tracking-[0.3em]">
          <LogoMark />
          LUORA
        </div>
        <RouteTabs />
        <div className="ml-auto flex items-center gap-3 px-4">
          <span className="text-dim hud-label">Audit console</span>
          <Chip tone="ok" dot>
            Defensive
          </Chip>
        </div>
      </header>
      {children}
    </div>
  );
}
