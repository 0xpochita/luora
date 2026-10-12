"use client";

import type { ReactNode } from "react";
import { PH, PhIcon } from "@/components/ui";
import { LOCAL_APP } from "@/config/site";
import { useRun } from "@/features/run";
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
  const { bridge, bridgeError, reloadBridge } = useRun();
  // forge runs here only in a local Luora, or on the auditor's machine through the bridge
  const live = LOCAL_APP || !!bridge;
  return (
    <aside className="flex w-[272px] flex-none flex-col overflow-auto rounded-card border border-border bg-card-grad p-2.5 shadow-soft">
      {/* both need the auditor's machine (re-reading the export, running forge) */}
      {live && (
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
          {live
            ? "In your Foundry project, then press Reload trace."
            : "In your Foundry project, then drop the new luora-data.json from Get started."}
        </p>
        <div className="flex flex-col gap-1.5">
          <CopyPill text="node luora-export.mjs" />
          <CopyPill text="node luora-export.mjs --mt test_x" />
        </div>
      </section>
      {/* the hosted site without a bridge: how to get Start test, Test all and Reload here */}
      {!live && (
        <section className="mt-2 rounded-inner border border-border bg-inner-grad p-3">
          <p className="mb-1 flex items-center gap-2 text-[13px] text-fg">
            <PhIcon d={PH.play} className="size-[14px] text-green" />
            Run tests from here
          </p>
          <p className="mb-3 text-[12.5px] text-dim leading-normal">
            Start the bridge in the same folder and open the link it prints.
            Start test, Test all and Reload trace then run forge on your
            computer; nothing is uploaded.
          </p>
          <CopyPill text="node luora-bridge.mjs" />
          <p className="mt-2 text-[12px] text-dim leading-normal">
            No luora-bridge.mjs there? Get it with the exporter (Get started).
          </p>
          {bridgeError && (
            <div className="mt-3 flex items-start gap-2 rounded-tile bg-red/[.08] p-2.5 text-[12px] text-body leading-normal">
              <span className="mt-1.5 size-1.5 flex-none rounded-full bg-red" />
              <span className="min-w-0 flex-1">
                {bridgeError}{" "}
                <button
                  type="button"
                  onClick={reloadBridge}
                  className="text-fg underline underline-offset-2"
                >
                  Retry
                </button>
              </span>
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
