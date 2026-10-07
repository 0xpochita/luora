"use client";

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
    <aside className="my-2 mr-2 flex w-[440px] flex-none flex-col overflow-hidden rounded-r-[32px] border-line border-l bg-panel shadow-sh1">
      <div className="mx-3.5 mt-3.5 mb-2 flex gap-1 overflow-x-auto rounded-full bg-soft p-1">
        {Object.keys(sources).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFile(f)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium font-mono text-[11.5px] ${
              f === file ? "bg-card text-ink shadow-sh1" : "text-muted"
            }`}
          >
            {f.split("/").pop()}
          </button>
        ))}
      </div>
      <p className="px-4.5 pt-1.5 pb-2.5 text-muted text-xs">
        {caption ? (
          <>
            <b className="font-semibold text-ink">{caption}</b>
            {span && ` · ${span.file} L${span.start + 1}–${span.end + 1}`}
            {span?.lines &&
              ` · ${spanLines(span, span.file).length} lines executed`}
          </>
        ) : (
          "Select a frame."
        )}
      </p>
      <CodeView
        source={sources[file] ?? ""}
        lines={spanLines(span, file)}
        notes={span?.notes?.[file]}
      />
    </aside>
  );
}
