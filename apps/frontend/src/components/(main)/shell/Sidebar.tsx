import type { ReactNode } from "react";
import { PH, PhIcon } from "@/components/ui";
import { LOCAL_APP } from "@/config/site";
import { CopyPill } from "./CopyPill";
import { ReloadButton } from "./ReloadButton";

export function Sidebar({
  children,
  action,
}: {
  children: ReactNode;
  /** beside Reload trace: Test all */
  action?: ReactNode;
}) {
  return (
    <aside className="flex w-[272px] flex-none flex-col overflow-auto rounded-card border border-border bg-card-grad p-2.5 shadow-soft">
      {/* both need this machine (re-reading the export, running forge): local Luora only */}
      {LOCAL_APP && (
        <div className="mb-3 flex gap-1.5">
          <ReloadButton />
          {action}
        </div>
      )}
      {children}
      {/* Re-run, in the header's family: a card whose commands are split capsules (command | Copy) */}
      <section className="mt-4 rounded-inner border border-border bg-inner-grad p-3">
        <p className="mb-1 flex items-center gap-2 text-[13px] text-fg">
          <PhIcon d={PH.terminal} className="size-[15px] text-muted" />
          Re-run
        </p>
        <p className="mb-3 text-[12.5px] text-dim leading-normal">
          {LOCAL_APP
            ? "In your Foundry project, then press Reload trace."
            : "In your Foundry project, then drop the new luora-data.json from Get started."}
        </p>
        <div className="flex flex-col gap-1.5">
          <CopyPill text="node luora-export.mjs" />
          <CopyPill text="node luora-export.mjs --mt test_x" />
        </div>
      </section>
    </aside>
  );
}
