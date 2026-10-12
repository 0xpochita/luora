"use client";

import { useState } from "react";

/** A command or snippet from the docs, with its own Copy button. */
export function CodeBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="overflow-hidden rounded-inner border border-border bg-[#0d0d0f]">
      <div className="flex justify-end border-white/[.05] border-b px-2 py-1.5">
        <button
          type="button"
          onClick={copy}
          className="rounded-full px-2.5 py-0.5 text-[12px] text-dim transition-colors hover:bg-white/[.05] hover:text-fg"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] text-fg leading-[1.7]">
        {text}
      </pre>
    </div>
  );
}
