import type { ReactNode } from "react";
import { Panel } from "@/components/ui";
import { ReloadButton } from "./ReloadButton";

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-[272px] flex-none flex-col overflow-auto border-line border-r bg-tray p-3">
      <ReloadButton />
      {children}
      <Panel label="Re-run" className="mt-4">
        <div className="p-3 text-muted text-xs">
          Run in your Foundry project, then reload:
          <code className="mt-2 block border border-line bg-shell px-2 py-1 font-mono text-[11px] text-ink">
            node luora-export.mjs
          </code>
          <code className="mt-1 block border border-line bg-shell px-2 py-1 font-mono text-[11px] text-ink">
            node luora-export.mjs --mt test_x
          </code>
        </div>
      </Panel>
    </aside>
  );
}
