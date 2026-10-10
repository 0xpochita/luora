"use client";

import { useState } from "react";
import { Chevron, Dropdown, Panel, PH, PhIcon } from "@/components/ui";
import {
  type Frame,
  human,
  type SourceSpan,
  spanLines,
  splitArgs,
} from "@/features/trace";
import { CodeView } from "./CodeView";

/**
 * Source of the selected call, with that call's details on top (Tenderly's call information
 * panel: decoded inputs, output, gas, where it was called from) and a file select whose names read
 * in full (docs/ux/trace-view.md).
 */
export function SourcePanel({
  sources,
  file,
  onFile,
  span,
  frame,
  index,
}: {
  sources: Record<string, string>;
  file: string;
  onFile: (f: string) => void;
  span: SourceSpan | null;
  frame?: Frame;
  index: number | null;
}) {
  const executed = span?.lines ? spanLines(span, span.file).length : 0;
  return (
    <Panel
      label="Source"
      aside={span ? `L${span.start + 1}–${span.end + 1}` : undefined}
      className="w-[440px] flex-none"
    >
      <div className="flex-none px-3 pb-2">
        <Dropdown
          ariaLabel="Source file"
          mono
          value={file}
          onChange={onFile}
          className="h-8 w-full"
          options={Object.keys(sources).map((f) => ({ value: f, label: f }))}
        />
      </div>
      {frame ? (
        <div className="mx-3 mb-2 flex-none rounded-inner border border-border bg-inner-grad px-3 py-2.5">
          <p className="flex items-center gap-2 font-mono text-[12.5px]">
            <span className="text-dim">#{index}</span>
            <span className="truncate">
              <span className="text-muted">{frame.to}.</span>
              <span className="text-fg">{frame.fn}</span>
            </span>
            {frame.gas != null && (
              <span className="ml-auto flex-none text-[11px] text-dim">
                {frame.gas.toLocaleString()} gas
              </span>
            )}
          </p>
          {(frame.args || frame.ret) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {splitArgs(frame.args).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-chip bg-raised px-1.5 py-0.5 font-mono text-[11px] text-fg"
                >
                  <em className="mr-1.5 text-dim not-italic">{k}</em>
                  {v}
                </span>
              ))}
              {frame.ret && (
                <span
                  className={`rounded-chip bg-raised px-1.5 py-0.5 font-mono text-[11px] ${frame.ok ? "text-muted" : "text-red"}`}
                >
                  {frame.ok ? (
                    <>
                      <Chevron /> {human(frame.ret)}
                    </>
                  ) : (
                    `✕ ${frame.ret}`
                  )}
                </span>
              )}
            </div>
          )}
          <p className="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
            <span className="min-w-0 flex-1 truncate">
              {frame.callSite
                ? `Called from ${frame.callSite.file.split("/").pop()}:${frame.callSite.line}`
                : "Test entry"}
              {executed > 0 && ` · ${executed} lines executed`}
            </span>
            <CopyLink />
          </p>
        </div>
      ) : (
        <p className="mx-3 mb-2 flex-none rounded-inner border border-border border-dashed px-3 py-2.5 text-[12.5px] text-dim">
          Select a call to see its arguments, return and the lines it ran.
        </p>
      )}
      <CodeView
        source={sources[file] ?? ""}
        lines={spanLines(span, file)}
        notes={span?.notes?.[file]}
        className="mx-2 mb-2 rounded-inner border border-border"
      />
    </Panel>
  );
}

/** Copies this page's link, which names the test and the call (?test=…&call=…), like Phalcon's ?line=. */
function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="flex flex-none items-center gap-1 rounded-chip border border-white/[.08] px-1.5 py-0.5 text-muted hover:border-white/20 hover:text-fg"
    >
      <PhIcon d={done ? PH.check : PH.copy} className="size-3" />
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
