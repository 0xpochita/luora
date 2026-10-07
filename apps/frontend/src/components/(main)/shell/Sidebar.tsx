import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui";
import { ReloadButton } from "./ReloadButton";

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-[272px] flex-none flex-col overflow-auto px-2.5 py-4">
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-4 font-semibold text-base tracking-tight">
        <LogoMark />
        Luora
      </div>
      <ReloadButton />
      {children}
      <div className="mt-4 rounded-3xl bg-card p-3.5 text-muted text-xs shadow-sh1">
        <b className="mb-1 block font-semibold text-ink">
          Re-run after editing tests
        </b>
        Run in your Foundry project, then reload:
        <code className="mt-1.5 block rounded-md bg-soft px-1.5 py-0.5 font-mono text-[11px] text-ink">
          node luora-export.mjs
        </code>
        <code className="mt-1 block rounded-md bg-soft px-1.5 py-0.5 font-mono text-[11px] text-ink">
          node luora-export.mjs --mt test_x
        </code>
      </div>
    </aside>
  );
}
