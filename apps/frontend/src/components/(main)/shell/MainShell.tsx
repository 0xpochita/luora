import Link from "next/link";
import type { ReactNode } from "react";
import { LogoText, MotionRoot } from "@/components/ui";
import { RunProvider } from "@/features/run";
import { DataBadge } from "../onboarding/DataBadge";
import { GuideButton } from "../onboarding/GuideButton";
import { RunDialog } from "../onboarding/RunDialog";
import { AiSettings } from "./AiSettings";
import { RouteTabs } from "./RouteTabs";
import "./header.css";

/** App frame shared by every route: floating brand + route tiles over the dot-grid canvas. */
export function MainShell({ children }: { children: ReactNode }) {
  return (
    <MotionRoot>
      <RunProvider>
        <div className="flex h-dvh flex-col overflow-hidden font-sans text-[13px] text-fg dot-grid">
          <header className="flex flex-none items-center gap-1.5 px-3 pt-3 pb-2">
            {/* the brand goes home, as on every site */}
            <Link
              href="/"
              aria-label="Luora home"
              title="Luora home"
              className="mr-2 ml-1 rounded-tile outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <LogoText height={24} />
            </Link>
            <RouteTabs />
            <div className="ml-auto flex items-center gap-2">
              <GuideButton />
              <DataBadge />
              <AiSettings />
            </div>
          </header>
          {children}
        </div>
        <RunDialog />
      </RunProvider>
    </MotionRoot>
  );
}
