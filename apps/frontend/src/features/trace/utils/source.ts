import type { Frame, LuoraData } from "../types";

export type SourceSpan = {
  /** Primary file and its 0-based line range (caption + scroll target). */
  file: string;
  start: number;
  end: number;
  /** Exact executed lines per file (0-based); absent for exports without step data. */
  lines?: Record<string, number[]>;
  /** Per-file line tags (0-based): storage ops, and where the frame was called / emitted from. */
  notes?: Record<string, Record<number, string[]>>;
};

function addNote(
  notes: Record<string, Record<number, string[]>>,
  file: string,
  line: number,
  tag: string,
) {
  notes[file] ??= {};
  const tags = notes[file][line - 1] ?? [];
  if (!tags.includes(tag)) notes[file][line - 1] = [...tags, tag];
}

/** Exact lines from the exporter's step data (or the call/emit site for frames without own code). */
function exactSpan(f: Frame): SourceSpan | null {
  const notes: Record<string, Record<number, string[]>> = {};
  for (const s of f.storage ?? []) addNote(notes, s.file, s.line, s.op);
  if (f.callSite)
    addNote(
      notes,
      f.callSite.file,
      f.callSite.line,
      f.kind === "EVENT" ? "emit" : "call",
    );
  const files = Object.keys(f.lines ?? {});
  if (f.lines && files.length) {
    const file = f.file && f.lines[f.file] ? f.file : files[0];
    const lines = Object.fromEntries(
      files.map((p) => [p, (f.lines?.[p] ?? []).map((n) => n - 1)]),
    );
    const own = lines[file];
    return { file, start: own[0], end: own[own.length - 1], lines, notes };
  }
  if (f.callSite) {
    const line = f.callSite.line - 1;
    return {
      file: f.callSite.file,
      start: line,
      end: line,
      lines: { [f.callSite.file]: [line] },
      notes,
    };
  }
  return null;
}

/** Find the file + lines a frame executed: exact when the export has step data, else the whole function. */
export function locateFrame(data: LuoraData, f: Frame): SourceSpan | null {
  const exact = exactSpan(f);
  if (exact && data.sources[exact.file]) return exact;
  const file =
    f.file ??
    Object.keys(data.sources).find((p) =>
      new RegExp(`(contract|interface)\\s+${f.contract}\\b`).test(
        data.sources[p],
      ),
    );
  if (!file || !data.sources[file]) return null;
  const lines = data.sources[file].split("\n");
  let start = lines.findIndex((l) =>
    new RegExp(`(function|event|modifier)\\s+${f.fn}\\b`).test(l),
  );
  if (start < 0)
    start = Math.max(
      0,
      lines.findIndex((l) => l.includes(f.fn)),
    );
  let end = start;
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    depth +=
      (lines[i].match(/{/g) ?? []).length - (lines[i].match(/}/g) ?? []).length;
    end = i;
    if (depth <= 0 && (i > start || !lines[i].includes("{"))) break;
  }
  return { file, start, end };
}

/** Lines to highlight in `file` for a span: exact set when known, else the span's range. */
export function spanLines(span: SourceSpan | null, file: string): number[] {
  if (!span) return [];
  if (span.lines) return span.lines[file] ?? [];
  if (span.file !== file) return [];
  return Array.from(
    { length: span.end - span.start + 1 },
    (_, i) => span.start + i,
  );
}
