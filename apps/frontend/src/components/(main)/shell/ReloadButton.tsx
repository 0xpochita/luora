"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PH, PhIcon } from "@/components/ui";

/**
 * Re-reads luora-data.json on the server after a fresh `node luora-export.mjs`. Same capsule as
 * the header's controls (header.css .hdr-pill), full width, the arrow turning while it reloads.
 */
export function ReloadButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      className="hdr-pill lit mb-3 w-full justify-start pr-2"
    >
      <PhIcon
        d={PH.reload}
        className={`size-[15px] ${pending ? "animate-spin motion-reduce:animate-none" : ""}`}
      />
      {pending ? "Reloading…" : "Reload trace"}
      <kbd className="ml-auto rounded-full border border-white/[.08] bg-black/30 px-2 py-0.5 font-mono text-[11px] text-dim">
        ⌘R
      </kbd>
    </button>
  );
}
