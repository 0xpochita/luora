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
      className="mb-3.5 flex w-full items-center gap-2 rounded-3xl bg-card px-3.5 py-3 font-medium shadow-sh1"
    >
      <span className={pending ? "animate-spin" : ""}>↻</span>
      {pending ? "Reloading…" : "Reload trace"}
      <kbd className="ml-auto font-mono text-[11px] text-dim">⌘R</kbd>
    </button>
  );
}
