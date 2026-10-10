"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE, PH, PhIcon } from "@/components/ui";
import type { FoundryTest } from "@/features/atlas/utils/lab-foundry";
import { CodeView } from "../source/CodeView";
import { download } from "./lab/LabView";

/**
 * The Scenarios view's right panel: the Foundry test the playground writes, live. Every edit on
 * the canvas rewrites it; the lines that are new since the last edit light up and the panel
 * scrolls to them, so wiring a card shows the code it became.
 */
export function TestPanel({ test }: { test: FoundryTest | null }) {
  const [copied, setCopied] = useState(false);
  const [fresh, setFresh] = useState<number[]>([]);
  const before = useRef<string[]>([]);
  const source = test?.source ?? "";

  useEffect(() => {
    const now = source.split("\n");
    const was = new Set(before.current);
    const first = before.current.length === 0;
    before.current = now;
    const added = now.flatMap((l, i) => (l.trim() && !was.has(l) ? [i] : []));
    // an edit changes a few lines; another scenario changes most of the file, so mark nothing
    setFresh(first || added.length > now.length / 2 ? [] : added);
  }, [source]);

  // full screen: the code over the whole window, still following the playground; Esc steps back
  // (caught before the Atlas's own Esc, which would close the panel)
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setFull(false);
    };
    addEventListener("keydown", onKey, true);
    return () => removeEventListener("keydown", onKey, true);
  }, [full]);

  if (!test)
    return (
      <p className="rounded-card border border-border border-dashed px-4 py-6 text-center text-[13px] text-dim">
        Pick a scenario, or start one with New. Its Foundry test is written here
        as you wire it.
      </p>
    );

  const card = (
    <section
      // in the panel it fills the column (aside children are otherwise their own height)
      style={full ? undefined : { flex: "1 1 0", minHeight: 0 }}
      className={`flex flex-col rounded-card border border-border bg-card-grad shadow-soft ${full ? "h-full" : ""}`}
    >
      <header className="flex flex-none items-center gap-2 px-4 pt-3.5 pb-1">
        <span
          className="size-1.5 flex-none rounded-full bg-green"
          title="Follows the playground"
        />
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">
          {test.file}
        </span>
        <button
          type="button"
          className="hdr-pill sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(test.source);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          <PhIcon d={copied ? PH.check : PH.copy} className="size-[14px]" />
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className="hdr-pill sm lit"
          onClick={() => download(test.file, test.source)}
        >
          Download
        </button>
        <button
          type="button"
          className="hdr-pill sm"
          aria-label={full ? "Exit full screen (Esc)" : "Full screen"}
          title={full ? "Back to the panel  Esc" : "Read the test full screen"}
          onClick={() => setFull((v) => !v)}
        >
          <PhIcon d={full ? PH.shrink : PH.expand} className="size-[14px]" />
          {full && "Exit full screen"}
        </button>
      </header>
      <p className="flex-none px-4 pb-2.5 text-[12px] text-dim leading-normal">
        Written from the playground as you wire it. Run it in your Foundry
        project:{" "}
        <code className="font-mono text-muted">
          node luora-scenario.mjs {test.file}
        </code>
      </p>
      <CodeView
        source={test.source}
        lines={fresh}
        className="mx-2 mb-2 min-h-0 flex-1 rounded-inner border border-border"
      />
    </section>
  );
  return full ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="dot-grid fixed inset-0 z-[70] bg-canvas p-3"
    >
      {card}
    </motion.div>
  ) : (
    card
  );
}
