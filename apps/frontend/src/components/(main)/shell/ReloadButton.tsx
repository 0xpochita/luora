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
      className="mb-3 flex w-full items-center gap-2 border border-edge bg-card px-3 py-2.5 text-ink transition-colors hud-label hover:border-accent"
    >
      <span className={pending ? "animate-spin" : ""}>↻</span>
      {pending ? "Reloading…" : "Reload trace"}
      <kbd className="ml-auto font-mono text-[10px] text-dim">⌘R</kbd>
    </button>
  );
}
