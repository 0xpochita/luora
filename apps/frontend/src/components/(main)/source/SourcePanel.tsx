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
      className="m-3 flex w-[440px] flex-none flex-col"
    >
      <Tabs
        value={file}
        onChange={onFile}
        size="sm"
        className="overflow-x-auto border-line border-b px-3 pb-2.5"
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
            {span?.lines &&
              ` · ${spanLines(span, span.file).length} lines executed`}
          </>
        ) : (
          <span className="ui-label text-dim">Select a frame</span>
        )}
      </p>
      <CodeView
        source={sources[file] ?? ""}
        lines={spanLines(span, file)}
        notes={span?.notes?.[file]}
      />
    </Panel>
  );
}
