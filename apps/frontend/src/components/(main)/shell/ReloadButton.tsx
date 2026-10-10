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
      className="hdr-pill lit has-kbd min-w-0 flex-1 justify-start"
      title="Re-read luora-data.json  ⌘R"
    >
      <PhIcon
        d={PH.reload}
        className={`size-[15px] ${pending ? "animate-spin motion-reduce:animate-none" : ""}`}
      />
      <span className="truncate">
        {pending ? "Reloading…" : "Reload trace"}
      </span>
      <kbd className="ml-auto flex-none rounded-full border border-white/[.08] bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-dim">
        ⌘R
      </kbd>
    </button>
  );
}
