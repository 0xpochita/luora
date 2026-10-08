"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

/** Re-reads luora-data.json on the server after a fresh `node luora-export.mjs`. */
export function ReloadButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      onClick={() => start(() => router.refresh())}
      className="mb-3 w-full justify-start"
    >
      <span className={pending ? "animate-spin" : ""}>↻</span>
      {pending ? "Reloading…" : "Reload trace"}
      <kbd className="ml-auto font-mono text-[11px] opacity-50">⌘R</kbd>
    </Button>
  );
}
