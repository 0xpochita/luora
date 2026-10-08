"use client";

import { Panel, Tabs } from "@/components/ui";
import { type SourceSpan, spanLines } from "@/features/trace";
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
      className="w-[440px] flex-none"
    >
      <Tabs
        value={file}
        onChange={onFile}
        size="sm"
        className="flex-none overflow-x-auto px-3 pb-2"
        options={Object.keys(sources).map((f) => ({
          value: f,
          label: f.split("/").pop() ?? f,
        }))}
      />
      <p className="flex-none truncate px-3.5 pb-2 font-mono text-muted text-xs">
        {caption ? (
          <>
            <b className="font-medium text-fg">{caption}</b>
            {span && ` · ${span.file}`}
            {span?.lines &&
              ` · ${spanLines(span, span.file).length} lines executed`}
          </>
        ) : (
          <span className="font-sans text-dim ui-label">Select a frame</span>
        )}
      </p>
      <CodeView
        source={sources[file] ?? ""}
        lines={spanLines(span, file)}
        notes={span?.notes?.[file]}
        className="mx-[5px] mb-[5px] rounded-inner"
      />
    </Panel>
  );
}
