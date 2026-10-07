"use client";

import { Panel, Tabs } from "@/components/ui";
import type { SourceSpan } from "@/features/trace";
import { CodeView } from "./CodeView";

export function SourcePanel({
  sources,
  file,
  onFile,
  span,
  caption,
}: {
  sources: Record<string, string>;
  file: string;
  onFile: (f: string) => void;
  span: SourceSpan | null;
  caption: string | null;
}) {
  return (
    <Panel
      label="Source"
      aside={span ? `L${span.start + 1}–${span.end + 1}` : "—"}
      className="m-3 flex w-[440px] flex-none flex-col"
    >
      <Tabs
        value={file}
        onChange={onFile}
        className="overflow-x-auto border-line border-b px-1"
        options={Object.keys(sources).map((f) => ({
          value: f,
          label: f.split("/").pop() ?? f,
        }))}
      />
      <p className="truncate border-line border-b px-3 py-2 font-mono text-muted text-xs">
        {caption ? (
          <>
            <b className="font-semibold text-ink">{caption}</b>
            {span && ` · ${span.file}`}
          </>
        ) : (
          <span className="hud-label text-dim">Select a frame</span>
        )}
      </p>
      <CodeView
        source={sources[file] ?? ""}
        highlight={span && span.file === file ? [span.start, span.end] : null}
      />
    </Panel>
  );
}
