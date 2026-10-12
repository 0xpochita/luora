"use client";

import { PH, PhIcon } from "@/components/ui";
import { useRun } from "@/features/run";

/**
 * Header badge: says what the app shows when it is a dropped file, the sample or a project linked
 * through the bridge, never silently, with a Reset that puts the app back to its default (nothing
 * loaded, the Start here page; it also unlinks the bridge). A run read from LUORA_DATA_PATH has no
 * badge: it is the app's own setting, not something to reset here.
 */
export function DataBadge() {
  const {
    run,
    setRun,
    origin,
    setPane,
    setSample,
    bridge,
    bridgeError,
    reloadBridge,
    dropBridge,
  } = useRun();

  const reset = () => {
    setRun(null);
    setSample(false);
    setPane(null);
    dropBridge();
  };
  // a bridge link that did not connect: say so, and let the auditor retry once it runs
  if (bridgeError)
    return (
      <span className="hdr-pill split">
        <span title={bridgeError} className="max-w-72">
          <span className="hdr-dot text-red" aria-hidden="true" />
          <span className="text-dim">Bridge</span>
          <span className="truncate text-fg">unreachable</span>
        </span>
        <button type="button" title={bridgeError} onClick={reloadBridge}>
          <PhIcon d={PH.reload} className="size-[14px]" />
          Retry
        </button>
        <button type="button" title="Forget the bridge link" onClick={reset}>
          <PhIcon d={PH.x} className="size-[13px]" />
        </button>
      </span>
    );
  if (!run && !bridge && origin !== "sample") return null;
  // T2 / T3: one capsule, what is shown on the left, its Reset inside on the right
  return (
    <span className="hdr-pill split">
      <span
        title={
          bridge
            ? "Linked to your Foundry project through luora-bridge.mjs: tests run on your computer"
            : run
              ? "Read in this tab only, never uploaded"
              : undefined
        }
        className="max-w-72"
      >
        <span
          className={`hdr-dot ${run || bridge ? "text-green" : "text-yellow"}`}
          aria-hidden="true"
        />
        <span className="text-dim">{bridge ? "Live" : "Viewing"}</span>
        <span
          className={`truncate text-fg ${run || bridge ? "font-mono text-[12.5px]" : ""}`}
        >
          {bridge ? bridge.project : run ? run.name : "Sample data"}
        </span>
      </span>
      <button
        type="button"
        title="Unload and go back to the Start here page"
        onClick={reset}
      >
        <PhIcon d={PH.reset} className="size-[14px]" />
        Reset
      </button>
    </span>
  );
}
