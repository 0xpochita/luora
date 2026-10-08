import type { ReactNode } from "react";
import { ReloadButton } from "./ReloadButton";

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-[272px] flex-none flex-col overflow-auto rounded-card border border-border bg-card-grad p-2.5 shadow-soft">
      <ReloadButton />
      {children}
      <section className="mt-4 rounded-inner border border-border bg-inner-grad p-3 text-[12.5px] text-muted">
        <p className="mb-2 text-fg ui-label">Re-run</p>
        Run in your Foundry project, then reload:
        <code className="mt-2 block rounded-chip bg-raised px-2 py-1 font-mono text-[11px] text-fg">
          node luora-export.mjs
        </code>
        <code className="mt-1 block rounded-chip bg-raised px-2 py-1 font-mono text-[11px] text-fg">
          node luora-export.mjs --mt test_x
        </code>
      </section>
    </aside>
  );
}
