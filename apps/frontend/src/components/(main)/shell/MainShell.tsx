import type { ReactNode } from "react";
import { Chip, LogoText } from "@/components/ui";
import { RunProvider } from "@/features/run";
import { DataBadge } from "../onboarding/DataBadge";
import { RunDialog } from "../onboarding/RunDialog";
import { AiSettings } from "./AiSettings";
import { RouteTabs } from "./RouteTabs";

/** App frame shared by every route: floating brand + route tiles over the dot-grid canvas. */
export function MainShell({ children }: { children: ReactNode }) {
  return (
    <RunProvider>
      <div className="flex h-dvh flex-col overflow-hidden font-sans text-[13px] text-fg dot-grid">
        <header className="flex flex-none items-center gap-1.5 px-3 pt-3 pb-2">
          <span className="mr-2 ml-1">
            <LogoText height={24} />
          </span>
          <RouteTabs />
          <div className="ml-auto flex items-center gap-1.5">
            <DataBadge />
            <AiSettings />
            <Chip>Audit console</Chip>
            <Chip tone="ok" dot>
              Defensive
            </Chip>
          </div>
        </header>
        {children}
      </div>
      <RunDialog />
    </RunProvider>
  );
}
