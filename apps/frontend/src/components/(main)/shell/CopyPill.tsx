"use client";

import { useState } from "react";
import { PH, PhIcon } from "@/components/ui";

/** A command as a split capsule (header.css .hdr-pill.split): the command, then its Copy. */
export function CopyPill({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <span className="hdr-pill split h-8 w-full">
      <span className="min-w-0 flex-1 pr-2!">
        <code
          title={text}
          className="block min-w-0 truncate font-mono text-[11.5px] text-fg"
        >
          {text}
        </code>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${text}`}
        className="flex-none text-muted"
      >
        <PhIcon d={copied ? PH.check : PH.copy} className="size-[13px]" />
      </button>
    </span>
  );
}
