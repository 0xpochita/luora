import type { ReactNode } from "react";
import { PH, PhIcon } from "@/components/ui";
import { CopyPill } from "./CopyPill";
import { ReloadButton } from "./ReloadButton";

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-[272px] flex-none flex-col overflow-auto rounded-card border border-border bg-card-grad p-2.5 shadow-soft">
      <ReloadButton />
      {children}
      {/* Re-run, in the header's family: a card whose commands are split capsules (command | Copy) */}
      <section className="mt-4 rounded-inner border border-border bg-inner-grad p-3">
        <p className="mb-1 flex items-center gap-2 text-[13px] text-fg">
          <PhIcon d={PH.terminal} className="size-[15px] text-muted" />
          Re-run
        </p>
        <p className="mb-3 text-[12.5px] text-dim leading-normal">
          In your Foundry project, then press Reload trace.
        </p>
        <div className="flex flex-col gap-1.5">
          <CopyPill text="node luora-export.mjs" />
          <CopyPill text="node luora-export.mjs --mt test_x" />
        </div>
      </section>
    </aside>
  );
}
