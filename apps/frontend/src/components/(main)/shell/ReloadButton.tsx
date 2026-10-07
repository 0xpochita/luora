"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Re-reads luora-data.json on the server after a fresh `node luora-export.mjs`. */
export function ReloadButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      className="group mb-3 block w-full chamfer bg-edge p-px [--cut:10px] hover:bg-accent"
    >
      <span className="flex chamfer items-center gap-2 bg-card px-3 py-2.5 text-ink hud-label [--cut:10px]">
        <span className={pending ? "animate-spin" : ""}>↻</span>
        {pending ? "Reloading…" : "Reload trace"}
        <kbd className="ml-auto font-mono text-[10px] text-dim">⌘R</kbd>
      </span>
    </button>
  );
}
